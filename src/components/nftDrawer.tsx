import { Address } from '@flashbots/suave-viem';
import useAuthNFTs, { AuthNFT } from '../hooks/useAuthNFTs';
import { useContext, useState } from 'react';
import { LoadingContext } from '../hooks/useLoading';

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

function NFTList({ nfts, loadNFT }: { nfts: AuthNFT[], loadNFT: LoadNFTCallback }) {
    return (<ul className="nft-ul">
        {nfts
            .map((nft, idx) => NFTListItem({ nft, idx, loadNFT }))}
    </ul>)
}

const nftDrawer = ({
    user,
    drawerOpen,
    setDrawerOpen,
    setIsLoading,
    loadNFT,
    nfts
}: {
    user: Address,
    drawerOpen: boolean,
    setDrawerOpen: (open: boolean) => void,
    setIsLoading: (loading: boolean) => void,
    loadNFT: LoadNFTCallback,
    nfts: AuthNFT[]
}) => {
    const userNFTs = nfts.filter(n => n.recipient.toLowerCase() === user.toLowerCase());
    return (
        nfts.filter(n => n.recipient.toLowerCase() === user.toLowerCase()).length > 0 && <div style={{ width: "13em" }}>
            <button className="text-lime-400 menu-button"
                style={{ width: "100%" }}
                onClick={() => setDrawerOpen(!drawerOpen)}>
                {drawerOpen ? "(hide)" : "My Collection"}
            </button>
            <div className='nft-drawer'>{drawerOpen &&
                <NFTList nfts={userNFTs} loadNFT={async (tokenId: bigint) => {
                    setIsLoading(true)
                    await loadNFT(tokenId)
                    setIsLoading(false)
                }} />
            }</div>
        </div>
    )
}

function NFTDrawer({ user, loadNFT }: { user: Address, loadNFT: (tokenId: bigint) => void }) {
    const { nfts } = useAuthNFTs();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { setIsLoading } = useContext(LoadingContext);

    return nftDrawer({ user, drawerOpen, setDrawerOpen, setIsLoading, loadNFT, nfts });
}

export default NFTDrawer;
