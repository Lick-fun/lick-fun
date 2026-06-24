// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Test} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

contract PredictionMarketAccessTest is Test {
    PredictionMarket pm;
    address feeReceiver = makeAddr("feeReceiver");
    address factory = makeAddr("factory");
    address attacker = makeAddr("attacker");
    address fakeToken = address(0xAA);
    address fakeCurve = address(0xBB);

    function setUp() public {
        vm.prank(factory);
        pm = new PredictionMarket(feeReceiver, factory);
    }

    function test_createMarket_onlyFactory() public {
        vm.prank(attacker);
        vm.expectRevert("ONLY_FACTORY");
        pm.createMarket(fakeToken, fakeCurve);
    }

    function test_factory_canCreateMarket() public {
        vm.prank(factory);
        pm.createMarket(fakeToken, fakeCurve);
        (address t,,,,,,,) = pm.markets(fakeToken);
        assertEq(t, fakeToken, "market created");
    }

    function test_cannotCreateDuplicateMarket() public {
        vm.prank(factory);
        pm.createMarket(fakeToken, fakeCurve);
        vm.prank(factory);
        vm.expectRevert("MARKET_EXISTS");
        pm.createMarket(fakeToken, fakeCurve);
    }
}