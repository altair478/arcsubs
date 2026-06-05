// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SubscriptionManager.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY_DEPLOYER");

        vm.startBroadcast(deployerKey);
        SubscriptionManager manager = new SubscriptionManager();
        vm.stopBroadcast();

        console.log("SubscriptionManager deployed at:", address(manager));
    }
}
