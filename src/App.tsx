import { useEffect, useState } from 'react'
import './App.css'
import { SuaveWallet, TransactionReceiptSuave, getSuaveProvider, getSuaveWallet } from '@flashbots/suave-viem/chains/utils'
import { Address, CustomTransport, Hex, createPublicClient, createWalletClient, custom, decodeAbiParameters, hexToString, http, numberToHex } from '@flashbots/suave-viem'
import config from './config'
import { MintRequest } from './suave/mint'
import { parseChatNFTLogs } from './suave/nft'
import { L1 } from './L1/chain'
import { decodeNFTEELogs, mintNFT, readNFT } from './L1/nftee'
import { escapeHtml } from './util'

const defaultPrompt = "Render a cat in ASCII art. Return only the raw result with no formatting or explanation."
type EthereumProvider = {
  request(...args: unknown[]): Promise<unknown>,
  on(e: string, handler: (x: string) => void): void,
}

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [promptInput, setPromptInput] = useState<string>("")
  const [prompts, setPrompts] = useState<string[]>([])
  const [suaveTxHash, setSuaveTxHash] = useState<string>()
  const [suaveWallet, setSuaveWallet] = useState<SuaveWallet<CustomTransport>>()
  const [suaveProvider] = useState(getSuaveProvider(http(config.suaveRpcHttp)))
  const [l1Provider] = useState(createPublicClient({
    transport: http(config.l1RpcHttp),
    chain: L1
  }))
  const [nftContent, setNftContent] = useState<Hex>()
  const [tokenId, setTokenId] = useState<bigint>()
  const [nftUri, setNftUri] = useState<string>()
  const [chainId, setChainId] = useState<string>()
  const [ethereum, setEthereum] = useState<EthereumProvider>()

  useEffect(() => {
    const load = async () => {
      if ('ethereum' in window) {
        const ethereum = window.ethereum as EthereumProvider
        ethereum.on("chainChanged", (chainId_) => {
          setChainId(chainId_)
        })
        setEthereum(ethereum)
        if (!chainId) {
          const chainId_ = await ethereum.request({ method: 'eth_chainId' }) as string
          setChainId(chainId_)
        }
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as Address[]
        setSuaveWallet(getSuaveWallet({
          transport: custom(ethereum as EthereumProvider),
          jsonRpcAccount: accounts[0],
          customRpc: config.suaveRpcHttp,
        }))
      } else {
        alert("Browser wallet not found. Please install one to continue.")
      }
    }
    load()
  }, [chainId])

  /** Make NFT on suave and mint on L1. */
  const onMint = async () => {
    setIsLoading(true)

    if (!suaveWallet || !ethereum) {
      throw new Error("L1 wallet not initialized")
    }
    try {
      const l1Wallet = createWalletClient({
        account: suaveWallet.account,
        chain: L1,
        transport: custom(ethereum),
      })

      // SUAVE creates the NFT & returns the signature required to mint it
      const suaveReceipt = await sendMintRequest()
      const { recipient, signature, tokenId, queryResult } = await parseChatNFTLogs(suaveReceipt)
      console.log("Created NFT from SUAVE", { tokenId, recipient, signature, queryResult })
      setTokenId(tokenId)

      // send L1 tx to actually mint the NFT
      // SUAVE could do this for us but we're doing it here for simplicity
      const mintTxBase = mintNFT(tokenId, signature, queryResult)
      const mintTx = {
        ...mintTxBase,
        gas: 500000n,
        gasPrice: await l1Provider.getGasPrice(),
        nonce: await l1Provider.getTransactionCount({ address: l1Wallet.account.address }),
      }

      try {
        const mintTxHash = await l1Wallet.sendTransaction(mintTx)
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
    if (!suaveWallet) {
      throw new Error("Suave wallet not initialized")
    }
    const mintRequest = new MintRequest(
      suaveWallet.account.address, // NOTE: we're relying on suaveWallet being the same address as l1Wallet!
      prompts.map(escapeHtml),
    )
    const ccr = mintRequest.confidentialRequest()
    const txHash = await suaveWallet.sendTransaction(ccr)
    setSuaveTxHash(txHash)
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
      return setPrompts([...prompts, defaultPrompt])
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

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {isLoading && <div className="loading">
        Loading
      </div>}
      <div className="text-2xl font-medium">🌿 ChatNFT</div>
      <div className='text-sm'>Mint an NFT from a ChatGPT prompt. Powered by SUAVE.</div>
      <div className='container mx-auto app'>
        <div id="promptArea" className="flex flex-col">
          <div className='text-lg'>Enter a prompt:</div>
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
              {chainId && parseInt(chainId, 16) !== config.l1ChainId ?
                <button className='blocking-alert text-sm' onClick={() => {
                  ethereum?.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: numberToHex(config.l1ChainId) }] })
                }}>
                  <em>
                    Connect your wallet to <span className='text-lime-300'>
                      {["localhost", "127.0.0.1"].includes(config.l1RpcHttp)
                        ?
                        config.l1RpcHttp :
                        "Holesky"}
                    </span> to mint NFTs
                  </em>
                </button> :
                <button type='button' className='button-secondary' onClick={onMint}>Mint NFT</button>
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
          {suaveTxHash && <div>SUAVE Tx Hash: {suaveTxHash}</div>}
        </div>}
        {nftContent && <div className="nftFrameContainer">
          <div className='text-lg' style={{ margin: 12 }}>This is your NFT!</div>
          <div className='text-lg' style={{ margin: 12, marginTop: -12 }}>⬇️⬇️⬇️⬇️</div>
          <div className='text-lg nftFrame'>{renderedNFT(nftContent)}</div>
          <div className='blocking-alert' style={{ margin: 12, marginTop: 24 }}>
            {!!nftUri &&
              <button className='button-default'
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
        </div>}
      </div>
      <div className="footer">
        <div>L1 NFT Address: {config.nfteeAddress}</div>
        <div style={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
          <div>Connected Wallet: {suaveWallet?.account.address}</div>
          {suaveWallet?.account.address.toLowerCase() !== suaveWallet?.account.address.toLowerCase() &&
            <div style={{ color: "#fa5949" }}>
              L1 Wallet: {suaveWallet?.account.address}
            </div>}
        </div>
      </div>
    </div>
  )
}


export default App
