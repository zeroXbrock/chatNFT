import { Address } from '@flashbots/suave-viem';
import useAuthNFTs from '../hooks/useAuthNFTs';

function NFTDrawer(user: Address) {
    const { nfts } = useAuthNFTs();
    return (<div>
        {nfts.length > 0 &&
            <div className='nft-drawer'>
                <ul>
                    {nfts
                        .filter(n => n.recipient.toLowerCase() === user.toLowerCase())
                        .map((nft, index) => (
                            <li key={index.toString()}>
                                {/* <a href={ }> */}
                                {nft.queryResult.substring(0, 16)}
                                {/* </a> */}
                            </li>
                        ))}
                </ul>
            </div>}
    </div>)
}

export default NFTDrawer;
