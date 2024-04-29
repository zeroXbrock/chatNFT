import { useState } from 'react'
import './App.css'
import { getSuaveWallet } from '@flashbots/suave-viem/chains/utils'
import { http } from '@flashbots/suave-viem'
import config from './config'
import { MintRequest } from './suave/mint'

function App() {
  const [promptInput, setPromptInput] = useState<string>("")
  const [prompts, setPrompts] = useState<string[]>([])
  const [txHash, setTxHash] = useState<string>()

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
    setTxHash(txHash)
  }

  const addPrompt = () => {
    setPrompts([...prompts, promptInput])
    setPromptInput("")
  }

  return (
    <>
      <label htmlFor='promptInput'>Prompt</label>
      <input id='promptInput' type='text' value={promptInput} onChange={e => setPromptInput(e.target.value)} />
      <button type='button' onClick={addPrompt}>Add Prompt</button>
      <ul>
        {prompts.map((prompt, i) => (
          <li key={`prompt_${i * i}`}>{prompt}</li>
        ))}
      </ul>
      <hr />
      <button type='button' onClick={sendMintRequest}>Mint NFT</button>
      <br />
      <br />
      {txHash && <div>Transaction Hash: {txHash}</div>}
    </>
  )
}

export default App
