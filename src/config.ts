import { Address, Hex } from '@flashbots/suave-viem'
import { suaveRigil } from '@flashbots/suave-viem/chains'

export default {
    suavePrivateKey: (() => {
        const envkey = process.env.SUAVE_PRIVATE_KEY
        if (!envkey) {
            throw new Error("SUAVE_PRIVATE_KEY must be set")
        }
        return envkey as Hex
    })(),
    suaveKettleAddress: (process.env.SUAVE_KETTLE_ADDRESS || "0x03493869959c866713c33669ca118e774a30a0e5") as Address,
    suaveRpcHttp: process.env.SUAVE_RPC_HTTP || suaveRigil.rpcUrls.public.http[0],
    l1RpcHttp: process.env.L1_RPC_HTTP || "https://rpc-sepolia.flashbots.net",
    l1ChainId: process.env.L1_CHAIN_ID || 11155111,
    chatNftAddress: (process.env.CHATNFT_ADDRESS || "0xTODO : deploy on rigil and hardcode here") as Address,
    openaiApiKey: (() => {
        const envkey = process.env.OPENAI_API_KEY
        if (!envkey) {
            throw new Error("OPENAI_API_KEY must be set")
        }
        return envkey
    })(),
}
