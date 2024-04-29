import { Transport } from '@flashbots/suave-viem';
import { SuaveWallet, TransactionRequestSuave } from '@flashbots/suave-viem/chains/utils';

export async function mint<T: Transport>(
    signer: SuaveWallet<T>,
) {
  // minting logic
}