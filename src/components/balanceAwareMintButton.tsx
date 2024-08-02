import { useState } from 'react';
import { useInterval } from './useInterval';
import { CustomTransport, Hex, HttpTransport, numberToHex, PublicClient } from '@flashbots/suave-viem';
import { SuaveProvider, SuaveWallet } from '@flashbots/suave-viem/chains/utils';
import { EthereumProvider } from './common';
import config from '../config';

function BalanceAwareMintButton({ signer, l1Provider, suaveProvider, chainId, ethereum, onMint }: {
    signer: SuaveWallet<CustomTransport>,
    l1Provider: PublicClient,
    suaveProvider: SuaveProvider<HttpTransport>,
    chainId: Hex,
    ethereum: EthereumProvider,
    onMint: () => void
}) {
    const [suaveBalance, setSuaveBalance] = useState<bigint>()
    const [l1Balance, setL1Balance] = useState<bigint>()

    useInterval(async () => {
        if (!l1BalanceSufficient()) {
            console.log("Fetching L1 balance...")
            const l1Balance = await l1Provider.getBalance({ address: signer.account.address })
            setL1Balance(l1Balance)
            console.log("L1 balance:", l1Balance)
        }
        if (!suaveBalanceSufficient()) {
            console.log("Fetching SUAVE balance...")
            const suaveBalance = await suaveProvider.getBalance({ address: signer.account.address })
            setSuaveBalance(suaveBalance)
            console.log("SUAVE balance:", suaveBalance)
        }
    }, 10000)

    const suaveBalanceSufficient = () => {
        return suaveBalance && suaveBalance > 10n ** 17n;
    };

    const l1BalanceSufficient = () => {
        return l1Balance && l1Balance > 25n * 10n ** 16n;
    };

    return (<div>
        {chainId && parseInt(chainId, 16) !== config.l1ChainId ?
            <button className='subtle-alert text-sm' onClick={() => {
                ethereum?.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: numberToHex(config.l1ChainId) }] })
            }}>
                <em>
                    Connect your wallet to <span className='text-lime-300'>
                        {
                            ["localhost", "127.0.0.1"].map(host =>
                                config.l1RpcHttp.includes(host)).length > 0
                                ?
                                config.l1RpcHttp :
                                "Holesky"}
                    </span> to mint NFTs
                </em>
            </button> : <>{suaveBalance && l1Balance && suaveBalanceSufficient() && l1BalanceSufficient() ?
                <button type='button' className='button-secondary' onClick={onMint}>Mint NFT</button> :
                <div className='subtle-alert text-sm'>
                    Insufficient balance on {!suaveBalanceSufficient() ? "SUAVE" : "L1"}.
                    <div style={{ padding: 8 }}>
                        <hr />
                    </div>
                    <div>
                        <a href={!suaveBalanceSufficient() ?
                            'https://faucet.toliman.suave.flashbots.net/' :
                            'https://faucet.quicknode.com/ethereum/holesky'
                        } target='_blank'>Fund my wallet!</a>
                        {/* note: there's no faucet for localhost and it's not worth guiding the user in that scenario,
                      so it's always gonna be real faucets here. */}
                    </div>
                </div>
            }</>}
    </div>);
}

export default BalanceAwareMintButton;
