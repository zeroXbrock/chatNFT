import { useState } from 'react'
import './App.css'
import { getSuaveWallet } from '@flashbots/suave-viem/chains/utils'
import { http } from '@flashbots/suave-viem'
import config from './config'
import { MintRequest } from './suave/mint'

function App() {
  const [promptInput, setPromptInput] = useState<string>("")
  const [prompts, setPrompts] = useState<string[]>([])
  const [suaveTxHash, setSuaveTxHash] = useState<string>()

  // TODO: replace with metamask wallet
  const suaveWallet = getSuaveWallet({
    transport: http(config.suaveRpcHttp),
    privateKey: config.suavePrivateKey,
  })

  const sendMintRequest = async () => {
    const mintRequest = new MintRequest(
      suaveWallet.account.address,
      config.suavePrivateKey,
      prompts,
    )
    const txHash = await suaveWallet.sendTransaction(mintRequest.confidentialRequest())
    setSuaveTxHash(txHash)
  }

  const addPrompt = () => {
    setPrompts([...prompts, promptInput])
    setPromptInput("")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div className="text-2xl font-medium">ChatNFT on SUAVE</div>
      <div className='container mx-auto app'>
        <div id="promptArea" className="flex flex-col">
          <div className='text-lg'>Enter a prompt:</div>
          <div style={{ width: "100%" }}><input name='promptInput' type='text' value={promptInput} onChange={e => setPromptInput(e.target.value)} /></div>
          <div style={{ width: "100%" }}><button type='button' onClick={addPrompt}>Add Prompt</button></div>
        </div>
        {prompts.length > 0 && <div className="flex flex-col" style={{ width: "100%", alignItems: "flex-start", border: "1px dotted white", padding: 12 }}>
          <div className='text-xl text-[#f0fff0]'>Your Prompts</div>
          <div style={{ padding: 32, width: "100%" }} className='flex flex-row'>
            <div className='basis-1/4'>
              <button type='button' onClick={sendMintRequest}>Mint NFT</button>
            </div>
            <div className='basis-3/4'>
              <ul className='list-disc' style={{ textAlign: "left" }}>
                {prompts.map((prompt, i) => (
                  <li key={`prompt_${i * i}`}>{prompt}</li>
                ))}
              </ul>
            </div>
            <br />
            <br />
          </div>
          {suaveTxHash && <div>SUAVE Tx Hash: {suaveTxHash}</div>}
        </div>}
      </div>
    </div>
  )
}

export default App
