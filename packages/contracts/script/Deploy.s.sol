// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Gauntlet, IERC20} from "../src/Gauntlet.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
    function envAddress(string calldata) external view returns (address);
    function envOr(string calldata, address) external view returns (address);
    function envOr(string calldata, uint256) external view returns (uint256);
}

/**
 * Deploy Gauntlet to Base Sepolia.
 *
 *   ORACLE_ADDRESS  required — the backend signer that settles epochs
 *   USDC_ADDRESS    optional — real USDC; if unset, deploys an open-faucet MockUSDC
 *   EPOCH_DURATION  optional — seconds (default 3600 = 1 hour)
 *
 * forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC \
 *   --private-key $DEPLOYER_KEY --broadcast
 */
contract Deploy {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    function run() external {
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        address usdcAddr = vm.envOr("USDC_ADDRESS", address(0));
        uint256 duration = vm.envOr("EPOCH_DURATION", uint256(3600));

        vm.startBroadcast();
        if (usdcAddr == address(0)) {
            usdcAddr = address(new MockUSDC());
        }
        new Gauntlet(IERC20(usdcAddr), oracle, duration);
        vm.stopBroadcast();
    }
}
