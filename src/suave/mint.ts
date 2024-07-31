import config from "../config"
import { Address, encodeFunctionData } from '@flashbots/suave-viem'
import { encodeAbiParameters } from '@flashbots/suave-viem/abi'
import { TransactionRequestSuave } from '@flashbots/suave-viem/chains/utils'
import ChatNFT from '../contracts/out/ChatNFT.sol/ChatNFT.json'

const mintAbi = 
[{
  components: [
    {name: 'recipient', type: 'address'},
    {name: 'prompts', type: 'string[]'},
  ],
  name: 'MintNFTConfidentialParams',
  type: 'tuple',
}]

export class MintRequest {
    constructor(
        public readonly recipient: Address,
        public readonly prompts: string[],
    ) {
        this.recipient = recipient
        this.prompts = prompts
    }

    confidentialInputs() {
        return encodeAbiParameters(mintAbi, [{
            recipient: this.recipient,
            prompts: this.prompts,
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
            type: '0x43'
        }
    }
}
