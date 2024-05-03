import { Address, Hex, PublicClient, bytesToHex, encodeFunctionData, hexToBytes, hexToString, parseGwei } from '@flashbots/suave-viem'
import config from '../config'
import NFTEE from '../contracts/out/NFTEE2.sol/SuaveNFT.json'

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
    let vi = parseInt(v, 16)
    if (vi <= 1) {
        vi += 27
    }

    const decodedQueryResult = hexToString(content)

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
                tokenId,
                recipient,
                decodedQueryResult,
                vi,
                r,
                s,
            ],
        })
    }
}
