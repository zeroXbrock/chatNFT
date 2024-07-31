import { Address, Hex, decodeEventLog, getEventSelector } from '@flashbots/suave-viem';
import { TransactionReceiptSuave } from '@flashbots/suave-viem/chains/utils';
import ChatNFT from '../contracts/out/ChatNFT.sol/ChatNFT.json';

export async function parseChatNFTLogs(receipt: TransactionReceiptSuave) {
    const logs = receipt.logs
    const topics = [
        getEventSelector('NFTCreated(uint256,address,bytes)'),
        getEventSelector('QueryResult(string)'),
    ]
    let nftCreatedLog = undefined
    let queryResultLog = undefined
    for (const log of logs) {
        if (log.topics[0] && topics.includes(log.topics[0])) {
            const decodedLog = decodeEventLog({
                abi: ChatNFT.abi,
                data: log.data,
                topics: log.topics,
            })
            if (log.topics[0] === topics[0]) {
                nftCreatedLog = decodedLog
            } else if (log.topics[0] === topics[1]) {
                queryResultLog = decodedLog
            } else {
                console.log("Unknown log")
                console.log(decodedLog)
            }
        }
    }
    if (!nftCreatedLog) {
        throw new Error("No NFTCreated log found")
    }
    if (!queryResultLog) {
        throw new Error("No QueryResult log found")
    }
    const { recipient, signature, tokenId } = nftCreatedLog.args as {
        recipient: Address, signature: Hex, tokenId: bigint
    }
    return {
        recipient,
        signature,
        tokenId,
        queryResult: (queryResultLog.args as {
            result: string
        }).result,
    }
}
