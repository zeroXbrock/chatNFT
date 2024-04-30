import { HttpTransport, PrivateKeyAccount, WalletClient } from '@flashbots/suave-viem';
import config from '../config';

export type L1Wallet = WalletClient<HttpTransport, typeof L1, PrivateKeyAccount>

export const L1 = {
  name: 'ethereum',
  id: config.l1ChainId,
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  network: 'testnet',
  rpcUrls: {
    default: { http: [config.l1RpcHttp] },
    public: { http: [config.l1RpcHttp] },
  },
}
