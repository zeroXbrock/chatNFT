// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "suave-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {SuaveNFT} from "../src/ethL1/NFTEE2.sol";
import {Emitter} from "../src/suave/712Emitter2.sol";

contract SigVerify is Test, SuaveEnabled {
    address admin = 0xB5fEAfbDD752ad52Afb7e1bD2E40432A485bBB7F;
    address recipient = 0x89bf140c76d918139411DB4a18E6BF24Fd65263F;

    function testValidSignature() public {
        SuaveNFT suaveNFT = new SuaveNFT(admin);
        string memory queryResult = " /\\\\_/\\\\  \\n( o.o ) \\n > ^ <";
        uint256 tokenId = 94377011712213956127224958937109039801146717388385496195118333435126609334782;
        bytes memory sig = Emitter.signMintApproval(
            tokenId,
            suaveNFT.admin(),
            recipient,
            queryResult,
            "0x6c45335a22461ccdb978b78ab61b238bad2fae4544fb55c14eb096c875ccfc52"
        );
        uint8 v;
        bytes32 r;
        bytes32 s;
        assembly {
            // Extract v, r, s from sig
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := mload(add(sig, 65))
        }
        console.log("r:");
        console.logBytes32(r);
        console.log("s:");
        console.logBytes32(s);
        if (v <= 1) {
            v += 27;
        }
        console.log("v: ", v);

        vm.startPrank(recipient);
        suaveNFT.mintNFTWithSignature(tokenId, queryResult, v, r, s);
        vm.stopPrank();
    }
}
