import config from "../config"
import { Address, Hex, encodeFunctionData, parseGwei } from '@flashbots/suave-viem'
import { encodeAbiParameters } from '@flashbots/suave-viem/abi'
import { TransactionRequestSuave } from '@flashbots/suave-viem/chains/utils'
import ChatNFT from '../abi/ChatNFT.json'

const mintAbi = /*
struct MintNFTConfidentialParams {
  {type: 'bytes', name: 'privateKey'}
  {type: 'address', name: 'recipient'}
  {type: 'string[]', name: 'prompts'}
  {type: 'string', name: 'openaiApiKey'}
}*/
[{
  components: [
    {name: 'privateKey', type: 'string'},
    {name: 'recipient', type: 'address'},
    {name: 'prompts', type: 'string[]'},
    {name: 'openaiApiKey', type: 'string'},
  ],
  name: 'MintNFTConfidentialParams',
  type: 'tuple',
}]

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
            // ^^^ something somewhere in the backend is expecting a string
            // ^^^ without the 0x prefix, rather than abi-encoded bytes which
            // ^^^ would be derived from our hex-string here.
            // ^^^ At any rate, a production SUAPP wouldn't be doing this.
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
