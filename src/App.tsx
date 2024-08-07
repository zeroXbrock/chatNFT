import { useEffect, useState } from 'react'
import './App.css'
import { SuaveWallet, TransactionReceiptSuave, getSuaveProvider, getSuaveWallet } from '@flashbots/suave-viem/chains/utils'
import { Address, CustomTransport, Hex, createPublicClient, createWalletClient, custom, decodeAbiParameters, hexToString, http } from '@flashbots/suave-viem'
import config from './config'
import { MintRequest } from './suave/mint'
import { parseChatNFTLogs } from './suave/nft'
import { L1 } from './L1/chain'
import { decodeNFTEELogs, mintNFT, readNFT } from './L1/nftee'
import { abbreviatedAddress, escapeHtml, EthereumProvider } from './util'
import SysNotifications, { INotification } from './components/notifications'
import BalanceAwareMintButton from './components/balanceAwareMintButton'
import useCachedNFTs from './hooks/useAuthNFTs'
import NFTDrawer from './components/nftDrawer'
import LoadingContext from './hooks/contextLoading'
import NotificationContext from './hooks/contextNotifications'

const defaultPrompt = "Render a cat in ASCII art. Return only the raw result with no formatting or explanation."

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [promptInput, setPromptInput] = useState<string>("")
  const [prompts, setPrompts] = useState<string[]>([])
  const [nftContent, setNftContent] = useState<Hex>()
  const [tokenId, setTokenId] = useState<bigint>()
  const [nftUri, setNftUri] = useState<string>()
  const [chainId, setChainId] = useState<string>()
  const [notifications, setNotifications] = useState<INotification[]>([])
  const [browserWallet, setBrowserWallet] = useState<SuaveWallet<CustomTransport>>()
  const { nfts, cacheNFT } = useCachedNFTs()

  const addNotification = (message: string, id: string, { href, linkText }: { linkText?: string, href?: string } = {}) => {
    const notification = {
      message,
      href,
      linkText,
      id,
      timestamp: new Date().getTime()
    } as INotification
    setNotifications([notification, ...notifications])
  }

  const l1Provider = createPublicClient({
    transport: http(config.l1RpcHttp),
    chain: L1
  })
  const suaveProvider = getSuaveProvider(http(config.suaveRpcHttp))
  const ethereum = ('ethereum' in window) && window.ethereum as EthereumProvider

  useEffect(() => {
    console.debug("L1_CHAIN_ID", config.l1ChainId)
    console.debug("L1_RPC_HTTP", config.l1RpcHttp)
    const load = async () => {
      if (!ethereum) {
        alert("Browser wallet not found. Please install one to continue.")
        return
      }
      ethereum.on("chainChanged", (chainId_) => {
        setChainId(chainId_)
      })
      if (!chainId) {
        const chainId_ = await ethereum.request({ method: 'eth_chainId' }) as string
        setChainId(chainId_)
      }
      if (!browserWallet) {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as Address[]
        setBrowserWallet(getSuaveWallet({
          transport: custom(ethereum as EthereumProvider),
          jsonRpcAccount: accounts[0],
          customRpc: config.suaveRpcHttp,
        }))
      }
    }
    load()
  }, [chainId,
    browserWallet,
    ethereum,
    nfts,
    notifications
  ])

  /** Make NFT on suave and mint on L1. */
  const onMint = async () => {
    setIsLoading(true)

    if (!browserWallet || !ethereum) {
      console.error("browserWallet", browserWallet, "ethereum", ethereum)
      throw new Error("wallet not initialized")
    }
    try {
      const l1Wallet = createWalletClient({
        account: browserWallet.account,
        chain: L1,
        transport: custom(ethereum),
      })

      // SUAVE creates the NFT & returns the signature required to mint it
      const suaveReceipt = await sendMintRequest()
      const suaveNftResult = await parseChatNFTLogs(suaveReceipt)
      const { signature, tokenId, queryResult } = suaveNftResult
      console.log("Created NFT from SUAVE", suaveNftResult)
      setTokenId(tokenId)

      // add tokenId to array in LocalStorage
      cacheNFT(suaveNftResult)

      // check for skill issue
      if (queryResult.toLowerCase().includes("sorry")) {
        addNotification("Skill issue detected", `sorry-${tokenId.toString()}`, {
          href: "/skillIssue.png",
          linkText: "."
        })
      }

      // send L1 tx to actually mint the NFT
      // SUAVE could do this for us but we're doing it here for simplicity
      const mintTxBase = mintNFT(tokenId, signature, queryResult)
      const mintTx = {
        ...mintTxBase,
        gas: 900000n,
        gasPrice: await l1Provider.getGasPrice(),
        nonce: await l1Provider.getTransactionCount({ address: l1Wallet.account.address }),
      }

      try {
        const mintTxHash = await l1Wallet.sendTransaction(mintTx)
        addNotification("Minting NFT on L1", mintTxHash, { href: `https://holesky.etherscan.io/tx/${mintTxHash}`, linkText: abbreviatedAddress(mintTxHash) })
        console.log("Minting NFT on L1", mintTxHash)
        const l1Receipt = await l1Provider.waitForTransactionReceipt({ hash: mintTxHash })
        if (l1Receipt.status !== 'success') {
          console.error("L1 transaction failed", l1Receipt)
          throw new Error("L1 transaction failed")
        }
        console.log("L1 transaction succeeded", l1Receipt)
        const decodedLogs = decodeNFTEELogs(l1Receipt)
        console.debug("Decoded logs", decodedLogs)
      } catch (e) {
        alert(`Failed to mint NFT on L1: ${e}`)
        return setIsLoading(false)
      }
      // now NFT is minted, we can render it
      await renderNFT(tokenId)
    } catch (e) {
      alert(`Failed to mint NFT on SUAVE: ${e}`)
    }
    setIsLoading(false)
  }

  /** Sends confidential request to ChatNFT SUAPP to create a new NFT and get the signature to mint it. */
  const sendMintRequest = async (): Promise<TransactionReceiptSuave> => {
    if (!browserWallet) {
      throw new Error("Suave wallet not initialized")
    }
    const mintRequest = new MintRequest(
      browserWallet.account.address, // NOTE: we're relying on suaveWallet being the same address as l1Wallet!
      prompts.map(escapeHtml),
    )
    const ccr = mintRequest.confidentialRequest()
    const txHash = await browserWallet.sendTransaction(ccr)
    addNotification('Creating NFT on SUAVE', txHash, {
      href: `https://explorer.toliman.suave.flashbots.net/tx/${txHash}`,
      linkText: abbreviatedAddress(txHash),
    })
    const receipt = await suaveProvider.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status !== 'success') {
      console.error("Transaction failed", receipt)
      throw new Error("Transaction failed")
    }
    return receipt
  }

  const renderNFT = async (tokenId: bigint) => {
    console.debug("Rendering NFT", tokenId)
    const { nft, uri } = await readNFT(l1Provider, tokenId)
    if (!nft.data) {
      console.error("NFT not found", tokenId)
      throw new Error("NFT not found")
    }
    if (!uri.data) {
      console.error("NFT not found", tokenId)
      throw new Error("NFT not found")
    }
    console.log("nft data", hexToString(nft.data))
    setNftContent(nft.data)
    try {
      const [decodedUri] = decodeAbiParameters([{ type: "string" }], uri.data)
      console.log("decoded URI", decodedUri)
      setNftUri(decodedUri)
    } catch {
      console.error("Failed to decode URI from abi params")
    }
  }

  const renderedNFT = (content: Hex) => {
    const [decodedContent] = decodeAbiParameters([{ type: "string" }], content)
    const decoded = decodedContent
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n')
    return decoded.split('\n').map((line, i) => (
      <div key={`line_${i + 1}`}><code style={{ whiteSpace: "pre" }}>{line}</code></div>
    ))
  }

  const onAddPrompt = () => {
    if (!promptInput) {
      setPrompts([...prompts, defaultPrompt])
      return
    }
    setPrompts([...prompts, promptInput])
    setPromptInput("")
  }

  const onViewRawNFT = () => {
    if (!nftUri) {
      return alert("No NFT URI found")
    }
    const w = window.open()
    w?.document.write(`<iframe src="${nftUri}"></iframe>`)
  }

  const buttonText = "text-[#f0fff0]"

  const leftStyle =
    { display: "flex", flexDirection: "column", alignItems: "flex-start" } as const

  return (<>
    <NotificationContext.Provider value={{ notifications, addNotification }}>
      <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
        <div style={leftStyle}>
          {isLoading && <div className="loading">
            Loading
          </div>}
          <SysNotifications messages={notifications} removeMessage={(id: string) => setNotifications(notifications.filter(
            n => n.id !== id
          ))} />
          <div className="menubar">
            <div style={leftStyle}>
              <div className="text-2xl font-medium">🌿 ChatNFT</div>
              <div className='text-sm'>Mint an NFT from a ChatGPT prompt. Powered by SUAVE.</div>
            </div>
            {browserWallet && <NFTDrawer user={browserWallet.account.address} loadNFT={renderNFT} />}
          </div>
          <div className='container mx-auto app'>
            <div id="promptArea" className="flex flex-col">
              <div style={{ width: "100%" }}>
                <form onSubmit={e => {
                  e.preventDefault()
                  onAddPrompt()
                }}>
                  <input name='promptInput' type='text' placeholder={defaultPrompt} value={promptInput}
                    onChange={e => setPromptInput(e.target.value)}
                    style={{ width: "100%" }}
                  />
                  <div className={buttonText} style={{ width: "100%" }}><button type='submit'>Add Prompt</button></div>
                </form>
              </div>
            </div>
            {prompts.length > 0 && <div className="flex flex-col" style={{
              width: "100%",
              alignItems: "flex-start",
              border: "1px dotted white",
              padding: 12
            }}>
              <div className="flex flex-row" style={{ width: "100%" }}>
                <div style={{ textAlign: 'left', paddingLeft: 32, paddingTop: 16 }} className='basis-1/4 text-xl'>Your Prompts</div>
                <div className={`basis-3/4 text-xl ${buttonText} flex flex-col`} style={{ alignItems: "flex-end" }}>
                  <button style={{ width: "min-content" }} onClick={() => {
                    setPrompts([])
                  }} type='button'>Clear</button>
                </div>
              </div>
              <div style={{ padding: 32, width: "100%" }} className='flex flex-row'>
                <div className='basis-1/4'>
                  {browserWallet && chainId && ethereum &&
                    <BalanceAwareMintButton
                      signer={browserWallet}
                      l1Provider={l1Provider}
                      suaveProvider={suaveProvider}
                      chainId={chainId as Hex}
                      ethereum={ethereum}
                      onMint={onMint} />
                  }
                </div>
                <div className='basis-3/4'>
                  <ul className='list-disc' style={{ textAlign: "left", paddingLeft: 64 }}>
                    {prompts.map((prompt, i) => (
                      <li key={`prompt_${i + 1}`}>{prompt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div >}
            {
              nftContent && <div className="nftFrameContainer">
                <div className='text-lg' style={{ margin: 12 }}>This is your NFT!</div>
                <div className='text-lg' style={{ margin: 12, marginTop: -12 }}>⬇️⬇️⬇️⬇️</div>
                <div className='text-lg nftFrame'>{renderedNFT(nftContent)}</div>
                <div className='subtle-alert' style={{ margin: 12, marginTop: 24, padding: 16 }}>
                  {!!nftUri &&
                    <button style={{ marginRight: 12 }} className='button-default'
                      onClick={onViewRawNFT}>
                      <a className={`${buttonText} font-mono`}>
                        View Raw NFT
                      </a>
                    </button>}
                  {!!tokenId &&
                    <button className='button-default'>
                      <a
                        href={`https://holesky.etherscan.io/token/${config.nfteeAddress}?a=${tokenId}`}
                        className={`${buttonText} font-mono`}
                        target='_blank'
                      >View on Etherscan
                      </a>
                    </button>}
                </div>
              </div>
            }
          </div >
          <div className="footer text-xs">
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
              <span>
                L1 NFTEE: <a className='footer-link' href={`https://holesky.etherscan.io/address/${config.nfteeAddress}`} target='_blank'>
                  {abbreviatedAddress(config.nfteeAddress)}
                </a>
              </span>
              <span>
                SUAVE ChatNFT: <a className='footer-link' href={`https://explorer.toliman.suave.flashbots.net/address/${config.chatNftAddress}?tab=txs`} target='_blank'>
                  {abbreviatedAddress(config.chatNftAddress)}
                </a>
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
              <span>
                (Connected) {browserWallet?.account.address}
              </span>
              <span>
                <a className='footer-link' href={`https://holesky.etherscan.io/address/${browserWallet?.account.address}`} target='_blank'>
                  Holesky
                </a>
            //
                <a className='footer-link' href={`https://explorer.toliman.suave.flashbots.net/address/${browserWallet?.account.address}?tab=txs`} target='_blank'>
                  Toliman
                </a>
              </span>
            </div>
          </div>
        </div >
      </LoadingContext.Provider>
    </NotificationContext.Provider>
  </>
  )
}

export default App
