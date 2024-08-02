import { numberToHex } from '@flashbots/suave-viem';
import { useState, useEffect } from 'react';

const TOKEN_IDS_KEY = 'tokenIds'

const loadTokenIds = () => {
    const storedTokenIds = localStorage.getItem(TOKEN_IDS_KEY);
    if (storedTokenIds) {
        return JSON.parse(storedTokenIds).map((x: string) => BigInt(x))
    }
    return [];
}

const useTokenIds = (): { tokenIds: bigint[], cacheTokenId: (x: bigint) => void } => {
    const [tokenIds, setTokenIds] = useState<bigint[]>(loadTokenIds() ?? []);

    useEffect(() => {
        localStorage.setItem(TOKEN_IDS_KEY, JSON.stringify(tokenIds.map(t => numberToHex(t))));
    }, [tokenIds]);

    const cacheTokenId = (tokenId: bigint) => {
        console.log('Caching token id', tokenId);
        setTokenIds([...tokenIds, tokenId]);
    }

    return { tokenIds, cacheTokenId };
};

export default useTokenIds;
