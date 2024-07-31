import { Hex, PublicClient, TransactionReceipt, bytesToHex, decodeEventLog, encodeFunctionData, hexToBytes, keccak256, stringToHex } from '@flashbots/suave-viem'
import config from '../config'
import NFTEE from '../contracts/out/NFTEE2.sol/SuaveNFT.json'

export function decodeNFTEELogs(receipt: TransactionReceipt) {
    const logs = receipt.logs
    const decodedLogs = []
    for (const log of logs) {
        const decodedLog = decodeEventLog({
            abi: NFTEE.abi,
            data: log.data,
            topics: log.topics,
        })
        decodedLogs.push(decodedLog)
    }
    return decodedLogs
}

export async function readNFT(
    ethProvider: PublicClient,
    tokenId: bigint,
) {
    // Use `tokenData` to read NFT data directly from the contract,
    // which we'll render for humans locally.
    const nft = await ethProvider.call({
        to: config.nfteeAddress,
        data: encodeFunctionData({
            abi: NFTEE.abi,
            functionName: 'tokenData',
            args: [tokenId],
        })
    })
    // We could also use `tokenURI` to get the metadata URI; on
    // GET, it returns ERC721Metadata{name, description, image}.
    // Then make a GET request to the URL at `metadata.image` to
    // get an SVG rendered from the NFT's onchain data.
    const uri = await ethProvider.call({
        to:config.nfteeAddress,
        data: encodeFunctionData({
            abi: NFTEE.abi,
            functionName: 'tokenURI',
            args: [tokenId],
        })
    })

    return {nft, uri}
}

/** Mint an NFT on L1, given a tokenId, signature, and content from ChatNFT.
 *
 * Ideally, this would be done in suave and we (the client) wouldn't have to,
 * but for demo's sake we'll do it here.
 */
export function mintNFT(
    tokenId: bigint,
    signature: Hex,
    content: string,
) {
    // parse signature into {r, s, v}
    const sigBytes = hexToBytes(signature)
    const r = bytesToHex(sigBytes.slice(0, 32))
    const s = bytesToHex(sigBytes.slice(32, 64))
    const v = bytesToHex(sigBytes.slice(64, 65))
    let vi = parseInt(v, 16)
    if (vi <= 1) {
        vi += 27
    }
    console.log({
        r,
        s,
        v,
        vi
    })

    // content = content.replace(/\\\\/g, "\\")
    // console.log("content", hexToString(content))
    console.log("hash(content)", keccak256(stringToHex(content)))
    console.log("content", content)

    // const decodedQueryResult = content
    // console.log('decodedQueryResult', `'${decodedQueryResult}'`)
    return {
        to: config.nfteeAddress,
        gas: 2000000n,
        gasPrice: 150n * (10n ** 9n),
        data: encodeFunctionData({
            abi: NFTEE.abi,
            functionName: 'mintNFTWithSignature',
            args: [
                /*
                uint256 tokenId,
                bytes content,
                uint8 v,
                bytes32 r,
                bytes32 s
                */
                tokenId,
                content,
                vi,
                r,
                s,
            ],
        })
    }
}
