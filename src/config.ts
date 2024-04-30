import { Address, Hex } from '@flashbots/suave-viem'
import { suaveRigil } from '@flashbots/suave-viem/chains'

const requireVar = (name: string) => {
    const envkey = process.env[name]
    if (!envkey) {
        throw new Error(`${name} must be set`)
    }
    return envkey
}

export default {
    suavePrivateKey: requireVar("SUAVE_PRIVATE_KEY") as Hex,
    suaveKettleAddress: (process.env.SUAVE_KETTLE_ADDRESS || "0x03493869959c866713c33669ca118e774a30a0e5") as Address,
    suaveRpcHttp: process.env.SUAVE_RPC_HTTP || suaveRigil.rpcUrls.public.http[0],
    l1ChainId: parseInt(process.env.L1_CHAIN_ID || "11155111"),
    l1RpcHttp: process.env.L1_RPC_HTTP || "https://rpc-sepolia.flashbots.net",
    l1PrivateKey: requireVar("L1_PRIVATE_KEY") as Hex,
    chatNftAddress: (process.env.CHATNFT_ADDRESS || "0xTODO : deploy on rigil and hardcode here") as Address,
    nfteeAddress: (process.env.NFTEE_ADDRESS || "0xTODO : deploy on testnet and hardcode here") as Address,
    openaiApiKey: requireVar("OPENAI_API_KEY"),
}
