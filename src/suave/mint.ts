import config from "../config"
import { Address, Hex, getFunctionSelector, parseGwei } from '@flashbots/suave-viem'
import { encodeAbiParameters } from '@flashbots/suave-viem/abi'
import { TransactionRequestSuave } from '@flashbots/suave-viem/chains/utils'
import mintAbi from '../abi/mintNFT'

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
        return encodeAbiParameters(mintAbi[0].inputs, [{
            privateKey: this.minterPrivateKey,
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
            data: getFunctionSelector("mintNFT()"),
            gas: 500000n,
            gasPrice: parseGwei("10"),
        }
    }
}
