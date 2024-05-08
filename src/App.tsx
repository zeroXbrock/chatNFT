import { useEffect, useState } from 'react'
import './App.css'
import { SuaveWallet, TransactionReceiptSuave, getSuaveProvider, getSuaveWallet } from '@flashbots/suave-viem/chains/utils'
import { Address, CustomTransport, Hex, createPublicClient, createWalletClient, custom, decodeAbiParameters, hexToString, http } from '@flashbots/suave-viem'
import config from './config'
import { MintRequest } from './suave/mint'
import { parseChatNFTLogs } from './suave/nft'
import { privateKeyToAccount } from '@flashbots/suave-viem/accounts'
import { L1 } from './L1/chain'
import { mintNFT, readNFT } from './L1/nftee'

const defaultPrompt = "Render a cat in ASCII art. Return only the raw result with no formatting or explanation."
type EthereumProvider = { request(...args: any): Promise<any> }

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [promptInput, setPromptInput] = useState<string>("")
  const [prompts, setPrompts] = useState<string[]>([])
  const [suaveTxHash, setSuaveTxHash] = useState<string>()
  const [suaveWallet, setSuaveWallet] = useState<SuaveWallet<CustomTransport>>()
  const [l1Wallet] = useState(createWalletClient({
    account: privateKeyToAccount(config.l1PrivateKey),
    chain: L1,
    transport: http(config.l1RpcHttp),
  }))
  const [suaveProvider] = useState(getSuaveProvider(http(config.suaveRpcHttp)))
  const [l1Provider] = useState(createPublicClient({
    transport: http(config.l1RpcHttp),
    chain: L1
  }))
  const [nftContent, setNftContent] = useState<Hex>()
  const [tokenId, setTokenId] = useState<bigint>()
  const [nftUri, setNftUri] = useState<string>()

  useEffect(() => {
    const load = async () => {
      if ('ethereum' in window) {
        const ethereum = window.ethereum as EthereumProvider
        const accounts: Address[] = await ethereum.request({ method: 'eth_requestAccounts' })
        setSuaveWallet(getSuaveWallet({
          transport: custom(ethereum as EthereumProvider),
          jsonRpcAccount: accounts[0],
        }))
      } else {
        alert("Browser wallet not found. Please install one to continue.")
      }
    }
    load()
  }, [])

  const onMint = async () => {
    if (!suaveWallet) {
      throw new Error("Suave wallet not initialized")
    }
    if (!l1Wallet || !l1Wallet.account) {
      throw new Error("L1 wallet not initialized")
    }
    setIsLoading(true)

    try {
      // SUAVE creates the NFT & returns the signature required to mint it
      const suaveReceipt = await sendMintRequest()
      const { recipient, signature, tokenId, queryResult } = await parseChatNFTLogs(suaveReceipt)
      console.log("Created NFT from SUAVE", { tokenId, recipient, signature, queryResult })
      setTokenId(tokenId)

      // send L1 tx to actually mint the NFT
      // SUAVE could do this for us but we're doing it here for simplicity
      const mintTxBase = mintNFT(tokenId, recipient, signature, queryResult)
      const mintTx = {
        ...mintTxBase,
        nonce: await l1Provider.getTransactionCount({ address: l1Wallet.account.address }),
      }
      try {
        const mintTxHash = await l1Wallet.sendTransaction(mintTx)
        console.log("Minted NFT on L1", mintTxHash)
        const l1Receipt = await l1Provider.waitForTransactionReceipt({ hash: mintTxHash })
        if (l1Receipt.status !== 'success') {
          console.error("L1 transaction failed", l1Receipt)
          throw new Error("L1 transaction failed")
        }
        console.log("L1 transaction succeeded", l1Receipt)
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

  const sendMintRequest = async (): Promise<TransactionReceiptSuave> => {
    if (!suaveWallet) {
      throw new Error("Suave wallet not initialized")
    }
    const mintRequest = new MintRequest(
      l1Wallet.account.address,
      config.l1PrivateKey,
      prompts,
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
    const { nft, svg } = await readNFT(l1Provider, tokenId)
    if (!nft.data) {
      console.error("NFT not found", tokenId)
      throw new Error("NFT not found")
    }
    if (!svg.data) {
      console.error("NFT not found", tokenId)
      throw new Error("NFT not found")
    }
    console.log("nft data", hexToString(nft.data))
    setNftContent(nft.data)
    try {
      const [uri] = decodeAbiParameters([{ type: "string" }], svg.data)
      const safeUri = encodeURI(uri)
      console.log(safeUri)
      setNftUri(safeUri)
    } catch {
      console.error("Failed to decode SVG URI from abi params")
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
    w?.document.write(`<iframe src=${nftUri}></iframe>`)
  }

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
              <input name='promptInput' type='text' placeholder={defaultPrompt} value={promptInput} onChange={e => setPromptInput(e.target.value)} style={{ width: "100%" }} />
              <div style={{ width: "100%" }}><button type='submit'>Add Prompt</button></div>
            </form>
          </div>
        </div>
        {prompts.length > 0 && <div className="flex flex-col" style={{ width: "100%", alignItems: "flex-start", border: "1px dotted white", padding: 12 }}>
          <div className="flex flex-row" style={{ width: "100%" }}>
            <div style={{ textAlign: 'left', paddingLeft: 32, paddingTop: 16 }} className='basis-1/4 text-xl'>Your Prompts</div>
            <div className='basis-3/4 text-xl text-[#f0fff0] flex flex-col' style={{ alignItems: "flex-end" }}>
              <button style={{ width: "min-content" }} onClick={() => {
                setPrompts([])
              }} type='button'>Clear</button>
            </div>
          </div>
          <div style={{ padding: 32, width: "100%" }} className='flex flex-row'>
            <div className='basis-1/4'>
              <button type='button' className='button-secondary' onClick={onMint}>Mint NFT</button>
            </div>
            <div className='basis-3/4'>
              <ul className='list-disc' style={{ textAlign: "left", paddingLeft: 64 }}>
                {prompts.map((prompt, i) => (
                  <li key={`prompt_${i + 1}`}>{prompt}</li>
                ))}
              </ul>
            </div>
            <br />
            <br />
          </div>
          {suaveTxHash && !nftContent && <div>SUAVE Tx Hash: {suaveTxHash}</div>}
        </div>}
        {nftContent && <div className="nftFrameContainer">
          <div className='text-lg' style={{ margin: 12 }}>This is your NFT!</div>
          <div className='text-lg' style={{ margin: 12, marginTop: -12 }}>⬇️⬇️⬇️⬇️</div>
          <div className='text-lg nftFrame'>{renderedNFT(nftContent)}</div>
          {!!nftUri && <button style={{ width: "max-content", margin: 12, marginTop: 12 }} onClick={onViewRawNFT}>
            View Raw NFT
          </button>}
          {!!tokenId && <div style={{ margin: 16, width: "100%", textAlign: "center" }} className='text-lg'>
            Token ID: {tokenId.toString()}
          </div>}
        </div>}
      </div>
      <div className="footer">
        <div>L1 NFT Address: {config.nfteeAddress}</div>
        <div style={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
          <div>Connected Wallet: {suaveWallet?.account.address}</div>
          {l1Wallet.account.address.toLowerCase() !== suaveWallet?.account.address.toLowerCase() &&
            <div style={{ color: "#fa5949" }}>
              L1 Wallet: {l1Wallet.account.address}
            </div>}
        </div>
      </div>
    </div>
  )
}

export default App
