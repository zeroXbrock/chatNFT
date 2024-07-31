// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Suave} from "suave-std/suavelib/Suave.sol";
import {Suapp} from "suave-std/Suapp.sol";
import {Context} from "suave-std/Context.sol";
import {ChatGPT} from "suave-std/protocols/ChatGPT.sol";
import {Emitter} from "./712Emitter2.sol";

/// @title ChatNFT: ChatGPT-based NFT Creator
/// @dev ChatNFT is responsible for querying ChatGPT on behalf of the user,
/// and storing the user's latest query result.
/// @dev Once the user is satisfied with the query result, they can choose to
/// create a new NFT with the query result. This can be an image, text;
/// any bytes-encoded data.
contract ChatNFT is Suapp {
    address public admin;
    address private owner;
    Suave.DataId private openAIKeyDataId;
    Suave.DataId private adminSignerKeyDataId;

    constructor(address _admin) {
        admin = _admin;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can call this function");
        _;
    }

    struct MintNFTConfidentialParams {
        address recipient;
        string[] prompts;
    }

    event QueryResult(string result);
    event NFTCreated(uint256 tokenId, address recipient, bytes signature);

    function onRegisterOpenAIKey(Suave.DataId recordId) public {
        openAIKeyDataId = recordId;
    }

    function onRegisterSignerKey(Suave.DataId recordId) public {
        adminSignerKeyDataId = recordId;
    }

    function _registerOpenAIKey()
        public
        confidential
        onlyOwner
        returns (bytes memory)
    {
        // must be an abi-encoded string
        bytes memory apiKey = Context.confidentialInputs();
        address[] memory peekers = new address[](2);
        peekers[0] = admin;
        peekers[1] = address(this);
        Suave.DataRecord memory rec = Suave.newDataRecord(
            0,
            peekers,
            peekers,
            "chatNFT_openai-api-key"
        );
        Suave.confidentialStore(rec.id, "OPENAI_API_KEY", apiKey);
        return
            abi.encodeWithSelector(this.onRegisterOpenAIKey.selector, rec.id);
    }

    function _getOpenAIKey() private returns (string memory) {
        return
            abi.decode(
                Suave.confidentialRetrieve(openAIKeyDataId, "OPENAI_API_KEY"),
                (string)
            );
    }

    function _registerSignerKey()
        public
        confidential
        onlyOwner
        returns (bytes memory)
    {
        // must be an abi-encoded string
        bytes memory signerKey = Context.confidentialInputs();
        address[] memory peekers = new address[](2);
        peekers[0] = admin;
        peekers[1] = address(this);
        Suave.DataRecord memory rec = Suave.newDataRecord(
            0,
            peekers,
            peekers,
            "chatNFT_signer-key"
        );
        Suave.confidentialStore(rec.id, "SIGNER_KEY", signerKey);
        return
            abi.encodeWithSelector(this.onRegisterSignerKey.selector, rec.id);
    }

    function _getSignerKey() private returns (string memory) {
        return
            abi.decode(
                Suave.confidentialRetrieve(adminSignerKeyDataId, "SIGNER_KEY"),
                (string)
            );
    }

    function newTokenId(
        string[] memory prompts
    ) private view returns (uint256) {
        return
            uint256(
                keccak256(abi.encode(prompts, block.timestamp, msg.sender))
            );
    }

    /// Logs the query result.
    function onMintNFT() public emitOffchainLogs {}

    /// Makes a query to ChatGPT with prompts given via confidentialInputs.
    /// Mints an NFT with the query result.
    function mintNFT()
        public
        confidential
        returns (bytes memory suaveCalldata)
    {
        // parse confidential inputs
        bytes memory cInputs = Suave.confidentialInputs();
        MintNFTConfidentialParams memory cParams = abi.decode(
            cInputs,
            (MintNFTConfidentialParams)
        );
        uint256 tokenId = newTokenId(cParams.prompts);

        // query ChatGPT
        ChatGPT chatGPT = new ChatGPT(_getOpenAIKey());
        ChatGPT.Message[] memory messages = new ChatGPT.Message[](
            cParams.prompts.length
        );
        for (uint256 i = 0; i < cParams.prompts.length; i++) {
            messages[i] = ChatGPT.Message({
                role: ChatGPT.Role.User,
                content: cParams.prompts[i]
            });
        }
        string memory queryResult = chatGPT.complete(messages);

        // sign a mint-approval for an NFT with the query result
        string memory signerKey = _getSignerKey();
        bytes memory signature = Emitter.signMintApproval(
            tokenId,
            admin,
            cParams.recipient,
            string(queryResult),
            signerKey
        );

        emit QueryResult(queryResult);
        emit NFTCreated(tokenId, cParams.recipient, signature);

        // Callback triggers log emission
        suaveCalldata = abi.encodeWithSelector(this.onMintNFT.selector);
    }
}
