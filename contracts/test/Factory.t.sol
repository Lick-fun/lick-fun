// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Test} from "forge-std/Test.sol";
import {Factory} from "../src/Factory.sol";

contract FactoryOwnerTest is Test {
    Factory factory;
    address owner = makeAddr("owner");
    address attacker = makeAddr("attacker");
    address treasury = makeAddr("treasury");

    function setUp() public {
        vm.prank(owner);
        factory = new Factory(treasury);
    }

    function test_onlyOwner_setFeeRouter() public {
        vm.prank(attacker);
        vm.expectRevert(Factory.NotOwner.selector);
        factory.setFeeRouter(address(0x1));
    }

    function test_onlyOwner_setGraduationRouter() public {
        vm.prank(attacker);
        vm.expectRevert(Factory.NotOwner.selector);
        factory.setGraduationRouter(address(0x1));
    }

    function test_onlyOwner_setPredictionMarket() public {
        vm.prank(attacker);
        vm.expectRevert(Factory.NotOwner.selector);
        factory.setPredictionMarket(address(0x1));
    }

    function test_onlyOwner_setVestingController() public {
        vm.prank(attacker);
        vm.expectRevert(Factory.NotOwner.selector);
        factory.setVestingController(address(0x1));
    }

    function test_alreadySet_reverts_AlreadySet() public {
        vm.startPrank(owner);
        factory.setFeeRouter(address(0x1));
        vm.expectRevert(Factory.AlreadySet.selector);
        factory.setFeeRouter(address(0x2));
        vm.stopPrank();
    }

    function test_owner_can_set_feeRouter() public {
        vm.prank(owner);
        factory.setFeeRouter(address(0x999));
        assertEq(factory.feeRouter(), address(0x999));
    }
}