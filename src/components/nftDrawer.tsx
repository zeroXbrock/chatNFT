import { Address } from '@flashbots/suave-viem';
import useAuthNFTs, { AuthNFT } from '../hooks/useAuthNFTs';
import { useContext, useEffect, useState } from 'react';
import LoadingContext from '../hooks/contextLoading';
import NotificationsContext, { NotificationsProps } from '../hooks/contextNotifications';

type LoadNFTCallback = (tokenId: bigint) => void;

function NFTListItem({ nft, idx, loadNFT }: { nft: AuthNFT, idx: number, loadNFT: LoadNFTCallback }) {
    return (
        <li className="nft-li" key={idx.toString()}>
            <button id="nft-button" className='menu-button text-slate-500' onClick={() => loadNFT(nft.tokenId)}>
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
    nfts,
    addNotification,
}: {
    user: Address,
    drawerOpen: boolean,
    setDrawerOpen: (open: boolean) => void,
    setIsLoading: (loading: boolean) => void,
    loadNFT: LoadNFTCallback,
    nfts: AuthNFT[],
    addNotification: NotificationsProps["addNotification"],
}) => {
    const userNFTs = nfts.filter(n => n.recipient.toLowerCase() === user.toLowerCase());
    return (
        nfts.filter(n => n.recipient.toLowerCase() === user.toLowerCase()).length > 0 && <div style={{ width: "13em" }}>
            <button className="text-lime-400 menu-button"
                id="nft-drawer-button"
                style={{ width: "100%" }}
                onClick={() => setDrawerOpen(!drawerOpen)}>
                {drawerOpen ? "(hide)" : "My Collection"}
            </button>
            <div id="nft-drawer" className='nft-drawer'>{drawerOpen &&
                <NFTList nfts={userNFTs} loadNFT={async (tokenId: bigint) => {
                    setIsLoading(true)
                    try {
                        await loadNFT(tokenId)
                    } catch (e) {
                        console.warn("Failed to load NFT", tokenId)
                        addNotification(`Failed to load NFT ${tokenId.toString().substring(0, 16)}`, `fail-${tokenId}`)
                    }
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
    const { addNotification } = useContext(NotificationsContext);

    useEffect(() => {
        document.addEventListener("click", (clickEvent: Event) => {
            if (clickEvent.target instanceof Element && !clickEvent.target.id.includes("nft")) {
                setDrawerOpen(false);
            }
        });
    }, [])

    return nftDrawer({ user, drawerOpen, setDrawerOpen, setIsLoading, loadNFT, nfts, addNotification });
}

export default NFTDrawer;
