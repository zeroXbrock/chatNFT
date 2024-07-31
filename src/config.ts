import { Address } from '@flashbots/suave-viem'
import { suaveRigil } from '@flashbots/suave-viem/chains'

/** Loads an env variable from the VITE_ namespace, which are available to the client. */
const getVar = (name: string) => {
    const envkey = import.meta.env[`VITE_${name}`]
    return envkey
}

/** Loads a var and throws an error if it isn't set. */
const requireVar = (name: string) => {
    const envkey = getVar(name)
    if (!envkey) {
        throw new Error(`${name} must be set`)
    }
    return envkey
}

export default {
    suaveKettleAddress: (
        getVar("SUAVE_KETTLE_ADDRESS") ||
        "0x03493869959c866713c33669ca118e774a30a0e5"
    ) as Address,
    suaveRpcHttp: getVar("SUAVE_RPC_HTTP") || suaveRigil.rpcUrls.public.http[0],
    l1ChainId: parseInt(getVar("L1_CHAIN_ID") || "11155111"),
    l1RpcHttp: getVar("L1_RPC_HTTP") || "https://rpc-sepolia.flashbots.net",
    chatNftAddress: requireVar("CHATNFT_ADDRESS") as Address,
    nfteeAddress: requireVar("NFTEE_ADDRESS") as Address,
}
