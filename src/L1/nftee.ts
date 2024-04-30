import { Address, Hex, PublicClient, bytesToHex, encodeFunctionData, hexToBytes, hexToString, parseGwei } from '@flashbots/suave-viem'
import config from '../config'
import NFTEE from '../abi/NFTEE.json'

export async function readNFT(
    ethProvider: PublicClient,
    tokenId: bigint,
) {
    const nft = await ethProvider.call({
        to: config.nfteeAddress,
        data: encodeFunctionData({
            abi: NFTEE.abi,
            functionName: 'tokenURI',
            args: [tokenId],
        })
    })
    return nft
}

/** Mint an NFT on L1.
 *
 * Ideally, this would be done in suave and we (the client) wouldn't have to,
 * but for demo's sake we'll do it here.
 */
export function mintNFT(
    tokenId: bigint,
    recipient: Address,
    signature: Hex,
    content: Hex,
) {
    // parse signature into {r, s, v}
    const sigBytes = hexToBytes(signature)
    const r = bytesToHex(sigBytes.slice(0, 32))
    const s = bytesToHex(sigBytes.slice(32, 64))
    const v = bytesToHex(sigBytes.slice(64, 65))
    console.log({ r, s, v })
    let vi = parseInt(v, 16)
    if (vi <= 1) {
        vi += 27
    }

    // const resbytes = hexToBytes(content)
    const decodedQueryResult = hexToString(content)
    console.log("chatNFT query result", decodedQueryResult)

    return {
        to: config.nfteeAddress,
        gas: 1000000n,
        gasPrice: parseGwei("96"),
        data: encodeFunctionData({
            abi: NFTEE.abi,
            functionName: 'mintNFTWithSignature',
            args: [
                /*
                uint256 tokenId,
                address recipient,
                string memory content,
                uint8 v,
                bytes32 r,
                bytes32 s
                */
                tokenId,    // uint256
                recipient,  // address
                decodedQueryResult,    // string
                vi,          // uint8
                r,          // bytes32
                s,          // bytes32
            ],
        })
    }
    
    // return await l1Wallet.sendRawTransaction({serializedTransaction: mintTx})
}