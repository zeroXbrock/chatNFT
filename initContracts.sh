#!/bin/bash

### This script must be ran before building/running the web app. It does two things:
### 1. Downloads and builds the smart contracts we need, placing the required build
###    artifacts in src/abi/.
### 2. Deploys the contracts to your local blockchain and updates .env with the
###    deployed contract addresses.
### This ensures that the web app can interact with the deployed contracts.
###
### Required system dependencies:
### - git
### - jq
### - Foundry (https://getfoundry.sh/)

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

source /dev/stdin <<< "$(curl -sL https://gist.githubusercontent.com/zeroXbrock/1000a692118fae62ceadee87ddc31654/raw/1ecf83bafdeb4949236d07f7c2a3e5294fd23c7f/checkenv.sh)"

# check required env vars
echo "checking environment variables ======================================"

# Array of environment variable names
env_vars=("OPENAI_API_KEY" "SUAVE_PRIVATE_KEY" "L1_PRIVATE_KEY" "SUAVE_RPC_HTTP" "L1_RPC_HTTP" "SIGNER_KEY")
# Loop through the array and call checkenv function for each variable
for var in "${env_vars[@]}"; do
        checkenv "$var"
    done
echo -e "$(printf "%s\tOK\n" "${env_vars[@]}")" | column -c 2 -t
echo "====================================================================="


SIGNER_ADDRESS=$(cast wallet address $SIGNER_KEY)
SUAVE_ADDRESS=$(cast wallet address $SUAVE_PRIVATE_KEY)
L1_ADDRESS=$(cast wallet address $L1_PRIVATE_KEY)

echo -e "L1 RPC:\t\t\t$L1_RPC_HTTP"
echo -e "Suave RPC:\t\t$SUAVE_RPC_HTTP"
echo -e "NFT Signer:\t\t$SIGNER_ADDRESS" 
echo -e "Suave Signer:\t\t$SUAVE_ADDRESS"
echo -e "L1 Signer:\t\t$L1_ADDRESS"
if [ -z "$KETTLE_ADDRESS" ]; then
    echo "KETTLE_ADDRESS not found. Using devnet kettle address..."
    KETTLE_ADDRESS="0xB5fEAfbDD752ad52Afb7e1bD2E40432A485bBB7F"
fi
if [ -z "$ENVFILE" ]; then
    echo "ENVFILE not found. Using '.env' to load/save deployment..."
    ENVFILE=".env"
fi

suaveBalance=$(cast balance -r $SUAVE_RPC_HTTP $SUAVE_ADDRESS)
echo -e "Suave balance:\t\t$(cast from-wei $suaveBalance) TEETH"

# Check L1 wallet balance, transfer funds from a default account if needed.
# This is assuming you're using anvil/hardhat for L1.
# If you're using suave-execution-geth, this step will be skipped.
l1Balance=$(cast balance -r $L1_RPC_HTTP $L1_ADDRESS)
echo -e "L1 Balance:\t\t$(cast from-wei $l1Balance) ETH"

if (( $(echo "$l1Balance < $(cast to-wei 0.25)" | bc -l) )); then
    echo "L1 Balance is too low. Quitting..."
    exit 11
fi
if (( $(echo "$suaveBalance < $(cast to-wei 0.1)" | bc -l) )); then
    echo "Suave Balance is too low. Quitting..."
    exit 12
fi

# build contracts & copy artifacts to src/abi/
cd src/contracts
forge build

echo "Ready to deploy contracts. Press Enter to continue..."
read

# deploy contracts
if [ "$NO_DEPLOY" ]; then
    echo "NO_DEPLOY detected. Skipping contract deployment..."
    source $SCRIPT_DIR/$ENVFILE
    ChatNFTAddress=$VITE_CHATNFT_ADDRESS
    NFTEEAddress=$VITE_NFTEE_ADDRESS
else
    echo "Deploying contracts..."
    ChatNFTAddress=$(forge create --json --legacy -r $SUAVE_RPC_HTTP --private-key $SUAVE_PRIVATE_KEY \
        ./src/suave/ChatNFT.sol:ChatNFT --constructor-args "$SIGNER_ADDRESS" | jq -r '.deployedTo')
    NFTEEAddress=$(forge create --json --legacy -r $L1_RPC_HTTP --private-key $L1_PRIVATE_KEY \
        ./src/ethL1/NFTEE2.sol:SuaveNFT --constructor-args "$SIGNER_ADDRESS" | jq -r '.deployedTo')
fi

echo -e "ChatNFT Address:\t$ChatNFTAddress"
echo -e "NFTEE Address:\t\t$NFTEEAddress"

# function to trim leading 0x from hex strings
trim0x() {
    echo $1 | sed 's/^0x//'
}

# register keys with ChatNFT contract
suave spell conf-request \
    --confidential-input $(cast abi-encode "x(string)" "$OPENAI_API_KEY") \
    --kettle-address $KETTLE_ADDRESS \
    --rpc $SUAVE_RPC_HTTP \
    --private-key $(trim0x $SUAVE_PRIVATE_KEY) \
    $ChatNFTAddress "_registerOpenAIKey()"
suave spell conf-request \
    --confidential-input $(cast abi-encode "x(string)" "$SIGNER_KEY") \
    --kettle-address $KETTLE_ADDRESS \
    --rpc $SUAVE_RPC_HTTP \
    --private-key $(trim0x $SUAVE_PRIVATE_KEY) \
    $ChatNFTAddress "_registerSignerKey()"

# update .env with deployed contract addresses
cd $SCRIPT_DIR
if [ ! -f "$ENVFILE" ]; then
    echo "$ENVFILE not found, copying .env.example to $ENVFILE"
    cp .env.example $ENVFILE
else
    echo "$ENVFILE found, making a backup at .env.bak"
    cp $ENVFILE .env.bak
fi
sed -i "s/CHATNFT_ADDRESS=.*/CHATNFT_ADDRESS=$ChatNFTAddress/" $ENVFILE
sed -i "s/NFTEE_ADDRESS=.*/NFTEE_ADDRESS=$NFTEEAddress/" $ENVFILE
