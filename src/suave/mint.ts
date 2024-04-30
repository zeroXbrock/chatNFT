import config from "../config"
import { Address, Hex, encodeFunctionData, parseGwei } from '@flashbots/suave-viem'
import { encodeAbiParameters } from '@flashbots/suave-viem/abi'
import { TransactionRequestSuave } from '@flashbots/suave-viem/chains/utils'
import mintAbi from '../abi/mintNFT'
import ChatNFT from '../abi/ChatNFT.json'

export class MintRequest {
    constructor(
        public readonly recipient: Address,
        private readonly minterPrivateKey: Hex,
        public readonly prompts: string[],
    ) {
        this.minterPrivateKey = minterPrivateKey
        this.recipient = recipient
        this.prompts = prompts
    }

    confidentialInputs() {
        return encodeAbiParameters(mintAbi, [{
            privateKey: this.minterPrivateKey.substring(2), // this is bad.
            // ^^^ for some reason, the interface is expecting a string without
            // ^^^ the 0x prefix, rather than abi-encoded bytes which we would
            // ^^^ derive from a hex string here.
            recipient: this.recipient,
            prompts: this.prompts,
            openaiApiKey: config.openaiApiKey,
        }])
    }

    confidentialRequest(): TransactionRequestSuave {
        return {
            to: config.chatNftAddress,
            confidentialInputs: this.confidentialInputs(),
            kettleAddress: config.suaveKettleAddress,
            data: encodeFunctionData({
                abi: ChatNFT.abi,
                functionName: 'mintNFT',
            }),
            gas: 5000000n,
            gasPrice: parseGwei("10"),
            type: '0x43'
        }
    }
}
