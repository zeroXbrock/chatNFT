import { Address, Hex, numberToHex } from '@flashbots/suave-viem';
import { useState, useEffect } from 'react';

const IDS_KEY = 'suave_nfts';

type AuthNFT<T> = {
    tokenId: T;
    recipient: Address;
    signature: Hex;
    queryResult: string;
}

const loadAuthNFTs = () => {
    const storedTokenIds = localStorage.getItem(IDS_KEY);
    if (storedTokenIds) {
        return JSON.parse(storedTokenIds).map((x: AuthNFT<Hex>) => ({ ...x, tokenId: BigInt(x.tokenId) })) as AuthNFT<bigint>[];
    }
    return [];
}

const useAuthNFTs = (): { nfts: AuthNFT<bigint>[], cacheNFT: (x: AuthNFT<bigint>) => void } => {
    const [nfts, setNFTs] = useState<AuthNFT<bigint>[]>(loadAuthNFTs() ?? []);

    useEffect(() => {
        if (nfts.length === 0) {
            return;
        }
        localStorage.setItem(IDS_KEY, JSON.stringify(nfts.map(t => ({
            ...t,
            tokenId: numberToHex(t.tokenId)
        }))));
    }, [nfts]);

    /** Add a new NFT to LocalStorage. */
    const cacheNFT = (nft: AuthNFT<bigint>) => {
        console.debug('Caching NFT', nft);
        setNFTs([...nfts, nft]);
    }

    return { nfts, cacheNFT };
};

export default useAuthNFTs;
