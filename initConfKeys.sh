#!/bin/bash

# download checkenv script
source /dev/stdin <<< "$(curl -sL https://gist.githubusercontent.com/zeroXbrock/1000a692118fae62ceadee87ddc31654/raw/1ecf83bafdeb4949236d07f7c2a3e5294fd23c7f/checkenv.sh)"

# check required env vars
env_vars=("OPENAI_API_KEY" "SUAVE_PRIVATE_KEY" "SUAVE_RPC_HTTP" "SIGNER_KEY" "KETTLE_ADDRESS" "ChatNFTAddress")
for var in "${env_vars[@]}"; do
    checkenv "$var"
done

# function to trim leading 0x from hex strings
trim0x() {
    echo $1 | sed 's/^0x//'
}

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
