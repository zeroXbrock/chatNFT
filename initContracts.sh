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

ANVIL_FUNDED_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
SUAVE_PRIVATE_KEY=0x91ab9a7e53c220e6210460b65a7a3bb2ca181412a8a7b43ff336b3df1737ce12
SUAVE_RPC_HTTP=http://localhost:8545
L1_PRIVATE_KEY=0x6c45335a22461ccdb978b78ab61b238bad2fae4544fb55c14eb096c875ccfc52
L1_RPC_HTTP=http://localhost:8555

SUAVE_ADDRESS=$(cast wallet address $SUAVE_PRIVATE_KEY)
L1_ADDRESS=$(cast wallet address $L1_PRIVATE_KEY)
echo -e "Suave Signer:\t\t$SUAVE_ADDRESS"
echo -e "L1 Signer:\t\t$L1_ADDRESS"

# Check L1 wallet balance, transfer funds from a default account if needed.
# This is assuming you're using anvil/hardhat for L1.
# If you're using suave-execution-geth, this step will be skipped.
l1Balance=$(cast balance -r $L1_RPC_HTTP $L1_ADDRESS)
echo -e "L1 Balance:\t\t$(cast from-wei $l1Balance) ETH"

if [[ "$l1Balance" < "$(cast to-wei 40)" ]]; then
    echo "Transferring 10 ETH to L1 signer..."
    cast send -r $L1_RPC_HTTP \
        --value 10ether \
        --private-key $ANVIL_FUNDED_KEY \
        $L1_ADDRESS
fi

# clone suapp-examples repo to get our contracts
git clone https://github.com/flashbots/suapp-examples.git
cd suapp-examples

# (temporary until merged) checkout the branch we need
git checkout brock/chatNFT
git pull

# build contracts & copy artifacts to src/abi/
forge build
cp ./out/ChatNFT.sol/ChatNFT.json ../src/abi/ChatNFT.json
cp ./out/NFTEE2.sol/SuaveNFT.json ../src/abi/NFTEE.json

# deploy contracts from chatGPT-nft-minter example
mkdir -p deployments
forge create --json -r $SUAVE_RPC_HTTP --private-key $SUAVE_PRIVATE_KEY \
    ./examples/chatGPT-nft-minter/suave/ChatNFT.sol:ChatNFT > ./deployments/ChatNFT.json
forge create --json --legacy -r $L1_RPC_HTTP --private-key $L1_PRIVATE_KEY \
    --gas-limit 5000000 \
    ./examples/chatGPT-nft-minter/ethL1/NFTEE2.sol:SuaveNFT --constructor-args $L1_ADDRESS > ./deployments/NFTEE.json
ChatNFTAddress=$(cat ./deployments/ChatNFT.json | jq -r '.deployedTo')
NFTEEAddress=$(cat ./deployments/NFTEE.json | jq -r '.deployedTo')

echo -e "ChatNFT Address:\t$ChatNFTAddress"
echo -e "NFTEE Address:\t\t$NFTEEAddress"

# update .env with deployed contract addresses
cd ..
if [ ! -f .env ]; then
    echo ".env not found, copying .env.example to .env"
    cp .env.example .env
else
    echo ".env found, making a backup at .env.bak"
    cp .env .env.bak
fi
sed -i "s/CHATNFT_ADDRESS=.*/CHATNFT_ADDRESS=$ChatNFTAddress/" .env
sed -i "s/NFTEE_ADDRESS=.*/NFTEE_ADDRESS=$NFTEEAddress/" .env

# delete repo
rm -rf suapp-examples
