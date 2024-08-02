import { Address } from '@flashbots/suave-viem';
import useAuthNFTs, { AuthNFT } from '../hooks/useAuthNFTs';
import { useState } from 'react';

type LoadNFTCallback = (tokenId: bigint) => void;

function NFTListItem({ nft, idx, loadNFT }: { nft: AuthNFT, idx: number, loadNFT: LoadNFTCallback }) {
    return (
        <li className="nft-li" key={idx.toString()}>
            <button className='menu-button' onClick={() => loadNFT(nft.tokenId)}>
                {nft.tokenId.toString().substring(0, 16)}
            </button>
        </li>
    )
}

function NFTList({ nfts, user, loadNFT }: { nfts: AuthNFT[], user: Address, loadNFT: LoadNFTCallback }) {
    return (<ul className="nft-ul">
        {nfts
            .filter(n => n.recipient.toLowerCase() === user.toLowerCase())
            .map((nft, idx) => NFTListItem({ nft, idx, loadNFT }))}
    </ul>)
}

function NFTDrawer({ user, loadNFT }: { user: Address, loadNFT: (tokenId: bigint) => void }) {
    const { nfts } = useAuthNFTs();
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (<>{nfts.length > 0 && <div style={{ width: "13em" }}>
        <button className="text-lime-400 menu-button"
            style={{ width: "100%" }}
            onClick={() => setDrawerOpen(!drawerOpen)}>
            {drawerOpen ? "(hide)" : "My Collection"}
        </button>
        <div className='nft-drawer'>{drawerOpen &&
            <NFTList nfts={nfts} user={user} loadNFT={loadNFT} />
        }</div></div>}
    </>)
}

export default NFTDrawer;
