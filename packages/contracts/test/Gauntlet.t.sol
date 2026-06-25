// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Gauntlet, IERC20} from "../src/Gauntlet.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

/// Minimal Foundry cheatcode surface (avoids a forge-std dependency).
interface Vm {
    function warp(uint256) external;
    function startPrank(address) external;
    function stopPrank() external;
}

contract GauntletTest {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    MockUSDC usdc;
    Gauntlet g;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    bytes32 constant A = "m_chatgpt";
    bytes32 constant B = "m_claude";

    function setUp() public {
        usdc = new MockUSDC();
        // This test contract is the oracle.
        g = new Gauntlet(IERC20(address(usdc)), address(this), 1 hours);
        usdc.mint(alice, 1000e6);
        usdc.mint(bob, 1000e6);
    }

    function _bet(address who, bytes32 model, uint256 amount) internal {
        vm.startPrank(who);
        usdc.approve(address(g), type(uint256).max);
        g.bet(model, amount);
        vm.stopPrank();
    }

    function test_betSettleClaim_redistributesByPerformance() public {
        uint256 epochId = g.currentEpoch();
        _bet(alice, A, 100e6); // backs ChatGPT
        _bet(bob, B, 100e6); // backs Claude

        // Pot = 200 USDC, split 100/100.
        require(g.epochTotal(epochId) == 200e6, "pot");

        // Epoch ends; ChatGPT +50%, Claude -50%:
        // newA = 200 * (100*1.5)/(100*1.5 + 100*0.5) = 150 ; newB = 50.
        vm.warp(g.epochEnd(epochId));
        bytes32[] memory ids = new bytes32[](2);
        ids[0] = A;
        ids[1] = B;
        uint256[] memory bals = new uint256[](2);
        bals[0] = 150e6;
        bals[1] = 50e6;
        g.settle(epochId, ids, bals);

        vm.startPrank(alice);
        g.claim(epochId, A);
        vm.stopPrank();
        vm.startPrank(bob);
        g.claim(epochId, B);
        vm.stopPrank();

        // Winner's backer profits, loser's backer loses — zero-sum.
        require(usdc.balanceOf(alice) == 1050e6, "alice payout");
        require(usdc.balanceOf(bob) == 950e6, "bob payout");
        require(usdc.balanceOf(address(g)) == 0, "escrow drained");
    }

    function test_settleRejectsNonConserved() public {
        uint256 epochId = g.currentEpoch();
        _bet(alice, A, 100e6);
        _bet(bob, B, 100e6);
        vm.warp(g.epochEnd(epochId));

        bytes32[] memory ids = new bytes32[](2);
        ids[0] = A;
        ids[1] = B;
        uint256[] memory bals = new uint256[](2);
        bals[0] = 150e6;
        bals[1] = 60e6; // sums to 210 != 200 pot — must revert

        (bool ok,) = address(g).call(
            abi.encodeWithSelector(g.settle.selector, epochId, ids, bals)
        );
        require(!ok, "non-conserved settle should revert");
    }
}
