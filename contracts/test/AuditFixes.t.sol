// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Test} from "forge-std/Test.sol";
import {LickToken} from "../src/LickToken.sol";
import {BondingCurve} from "../src/BondingCurve.sol";
import {Factory} from "../src/Factory.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {GraduationRouter} from "../src/GraduationRouter.sol";
import {LickFactory} from "../src/LickFactory.sol";
import {LickPair} from "../src/LickPair.sol";
import {VaultLPSupport} from "../src/VaultLPSupport.sol";
import {VaultBuybackBurn} from "../src/VaultBuybackBurn.sol";
import {VestingController} from "../src/VestingController.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {ProfileRegistry} from "../src/ProfileRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Minimal WETH mock used by the migration tests.
contract MockWETHA {
    string public name = "Wrapped MON";
    string public symbol = "WMON";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
    }
    function withdraw(uint256 wad) public {
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
    }
    function approve(address spender, uint256 wad) public returns (bool) {
        allowance[msg.sender][spender] = wad;
        return true;
    }
    function transfer(address to, uint256 wad) public returns (bool) {
        return transferFrom(msg.sender, to, wad);
    }
    function transferFrom(address from, address to, uint256 wad) public returns (bool) {
        require(balanceOf[from] >= wad, "bal");
        if (from != msg.sender && allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= wad;
        }
        balanceOf[from] -= wad;
        balanceOf[to] += wad;
        return true;
    }
    receive() external payable { deposit(); }
}

/// @dev Bonding-curve oracle mock for PredictionMarket tests.
contract MockCurveA {
    bool public graduated;
    function setGraduated(bool g) external { graduated = g; }
}

/// @dev Contract wallet whose receive() costs more than 2300 gas (defeats .transfer).
contract GreedyWallet {
    uint256 public slot;
    receive() external payable {
        // Writing to storage costs far more than the 2300-gas stipend of .transfer.
        slot = block.timestamp;
    }
}

/// @dev Standard ERC20 used for M-02 / M-03 pair tests.
contract StdToken {
    string public name = "Std";
    string public symbol = "STD";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 amt) external { balanceOf[to] += amt; }
    function approve(address s, uint256 a) external returns (bool) { allowance[msg.sender][s] = a; return true; }
    function transfer(address to, uint256 a) external returns (bool) { return _t(msg.sender, to, a); }
    function transferFrom(address f, address to, uint256 a) external returns (bool) {
        if (allowance[f][msg.sender] != type(uint256).max) allowance[f][msg.sender] -= a;
        return _t(f, to, a);
    }
    function _t(address f, address to, uint256 a) internal returns (bool) {
        require(balanceOf[f] >= a, "bal"); balanceOf[f] -= a; balanceOf[to] += a; return true;
    }
}

/// @dev Non-standard ERC20 whose transfer returns false (must be rejected by SafeERC20).
contract BadToken {
    mapping(address => uint256) public balanceOf;
    function mint(address to, uint256 amt) external { balanceOf[to] += amt; }
    function approve(address, uint256) external pure returns (bool) { return true; }
    function transfer(address, uint256) external pure returns (bool) { return false; }
    function transferFrom(address, address, uint256) external pure returns (bool) { return false; }
}

/**
 * @title AuditFixesTest
 * @notice Regression tests for the 2026-06-27 mainnet audit findings.
 */
contract AuditFixesTest is Test {
    address creator = makeAddr("creator");
    address attacker = makeAddr("attacker");
    address treasury = makeAddr("treasury");
    address buyer = makeAddr("buyer");

    // ─────────────────────────── C-01: vault recoverability ───────────────────────────

    address constant DUMMY_ROUTER_A = address(0x1111);
    address constant DUMMY_WMON_A   = address(0x2222);
    address constant DUMMY_FACTORY_A = address(0x3333);
    address constant DUMMY_GRAD_A    = address(0x4444);

    function test_C01_vaultLP_recoverable() public {
        VaultLPSupport v = new VaultLPSupport(treasury, DUMMY_ROUTER_A, DUMMY_WMON_A, DUMMY_GRAD_A);
        vm.deal(address(this), 5 ether);
        (bool ok,) = address(v).call{value: 3 ether}("");
        assertTrue(ok);
        assertEq(address(v).balance, 3 ether);

        // Non-owner cannot sweep.
        vm.prank(attacker);
        vm.expectRevert(VaultLPSupport.NotOwner.selector);
        v.sweep(attacker, 3 ether);

        // Owner can recover funds.
        vm.prank(treasury);
        v.sweep(treasury, 3 ether);
        assertEq(treasury.balance, 3 ether);
    }

    function test_C01_vaultBB_recoverable() public {
        VaultBuybackBurn v = new VaultBuybackBurn(treasury, DUMMY_ROUTER_A, DUMMY_FACTORY_A, DUMMY_GRAD_A);
        vm.deal(address(this), 2 ether);
        (bool ok,) = address(v).call{value: 2 ether}("");
        assertTrue(ok);
        vm.prank(treasury);
        v.sweep(treasury, 2 ether);
        assertEq(treasury.balance, 2 ether);
    }

    function test_C01_vault_rejects_zero_owner() public {
        vm.expectRevert(VaultLPSupport.ZeroAddress.selector);
        new VaultLPSupport(address(0), DUMMY_ROUTER_A, DUMMY_WMON_A, DUMMY_GRAD_A);
    }

    // ─────────────────────────── C-02: initVesting access control ───────────────────────────

    function test_C02_initVesting_onlyOwner() public {
        VestingController vesting = new VestingController(); // owner = this
        address token = makeAddr("vToken");

        // Attacker cannot initialise vesting (front-run hijack blocked).
        vm.prank(attacker);
        vm.expectRevert(VestingController.NotOwner.selector);
        vesting.initVesting(token, attacker, 1_000 ether, VestingController.Tier.LIGHT, block.timestamp);

        // Owner can.
        vesting.initVesting(token, creator, 1_000 ether, VestingController.Tier.LIGHT, block.timestamp);
        (, address beneficiary,,,,,,,) = vesting.allocations(token);
        assertEq(beneficiary, creator);
    }

    // ─────────────────────────── H-03: zero creator address ───────────────────────────

    function test_H03_createToken_zeroCreator_reverts() public {
        Factory factory = new Factory(treasury);
        vm.expectRevert(Factory.ZeroAddress.selector);
        factory.createToken("T", "T", address(0), 0);
    }

    // ─────────────────────────── M-01: setGraduationRouter lock ───────────────────────────

    function test_M01_router_lock_blocks_recall() public {
        LickFactory dex = new LickFactory(address(this)); // owner = this
        address r1 = makeAddr("router1");
        address r2 = makeAddr("router2");

        dex.setGraduationRouter(r1);
        dex.lockRouter();

        vm.expectRevert(LickFactory.AlreadyLocked.selector);
        dex.setGraduationRouter(r2);

        vm.expectRevert(LickFactory.AlreadyLocked.selector);
        dex.lockRouter();
    }

    // ─────────────────────────── M-04: FeeRouter config gating ───────────────────────────

    function test_M04_applyPreset_onlyFactoryOrOwner() public {
        VaultLPSupport vlp = new VaultLPSupport(treasury, DUMMY_ROUTER_A, DUMMY_WMON_A, DUMMY_GRAD_A);
        VaultBuybackBurn vbb = new VaultBuybackBurn(treasury, DUMMY_ROUTER_A, DUMMY_FACTORY_A, DUMMY_GRAD_A);
        FeeRouter fr = new FeeRouter(address(0x111), address(vlp), address(vbb)); // owner = this
        address token = makeAddr("frToken");

        // Random caller (not factory, not owner) is rejected.
        vm.prank(attacker);
        vm.expectRevert(FeeRouter.NotAuthorized.selector);
        fr.applyPreset(token, creator, FeeRouter.Preset.DEFAULT);

        // Owner can.
        fr.applyPreset(token, creator, FeeRouter.Preset.DEFAULT);
        (,,,,, address cfgCreator, bool initialized) = fr.tokenFeeConfigs(token);
        assertTrue(initialized);
        assertEq(cfgCreator, creator);
    }

    function test_M04_setFactory_once() public {
        VaultLPSupport vlp = new VaultLPSupport(treasury, DUMMY_ROUTER_A, DUMMY_WMON_A, DUMMY_GRAD_A);
        VaultBuybackBurn vbb = new VaultBuybackBurn(treasury, DUMMY_ROUTER_A, DUMMY_FACTORY_A, DUMMY_GRAD_A);
        FeeRouter fr = new FeeRouter(address(0x111), address(vlp), address(vbb));
        fr.setFactory(address(0xF));
        vm.expectRevert(FeeRouter.AlreadySet.selector);
        fr.setFactory(address(0xF2));
    }

    // ─────────────────────────── M-07: contract-wallet bond refund ───────────────────────────

    function test_M07_contractWallet_can_unlink() public {
        ProfileRegistry reg = new ProfileRegistry();

        // A normal wallet creates a profile.
        vm.prank(creator);
        uint256 profileId = reg.registerProfile();

        // A contract wallet whose receive() costs > 2300 gas links with a bond.
        GreedyWallet wallet = new GreedyWallet();
        vm.deal(address(wallet), 1 ether);
        vm.prank(address(wallet));
        reg.linkWallet{value: 0.1 ether}(profileId);
        assertEq(address(wallet).balance, 0.9 ether);

        // Unlinking must succeed via checked .call even though receive() costs > 2300 gas.
        vm.prank(address(wallet));
        reg.unlinkWallet(profileId);
        assertEq(address(wallet).balance, 1 ether); // bond refunded
    }

    // ─────────────────────────── L-07: merkle root / anchor ───────────────────────────

    function test_L07_zeroRoot_rejected_and_rotation() public {
        ProfileRegistry reg = new ProfileRegistry(); // anchor = this
        vm.expectRevert(bytes("ZERO_ROOT"));
        reg.setMerkleRoot(bytes32(0));

        reg.setMerkleRoot(bytes32(uint256(1)));

        // Rotate the anchor; old anchor can no longer post.
        address newAnchor = makeAddr("newAnchor");
        reg.setMerkleAnchor(newAnchor);
        vm.expectRevert(bytes("Only merkle anchor"));
        reg.setMerkleRoot(bytes32(uint256(2)));
    }

    // ─────────────────────────── H-01 / H-04 via full stack ───────────────────────────

    function _deployStack()
        internal
        returns (Factory factory, LickFactory dex, GraduationRouter router, MockWETHA weth)
    {
        dex = new LickFactory(address(this));
        weth = new MockWETHA();
        factory = new Factory(treasury);
        router = new GraduationRouter(address(dex), address(weth), treasury, address(factory));
        factory.setGraduationRouter(address(router));
        dex.setGraduationRouter(address(router));
    }

    function _predictPair(LickFactory dex, address tokenA, address tokenB) internal pure returns (address) {
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        bytes32 salt = keccak256(abi.encodePacked(t0, t1));
        bytes32 initHash = keccak256(type(LickPair).creationCode);
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(dex), salt, initHash)))));
    }

    function test_H01_migration_ignores_donation() public {
        (Factory factory, LickFactory dex, GraduationRouter router, MockWETHA weth) = _deployStack();

        (address tokenAddr, address curveAddr) =
            factory.createToken("Donate", "DON", creator, block.timestamp);
        LickToken token = LickToken(tokenAddr);
        BondingCurve curve = BondingCurve(payable(curveAddr));

        // Graduate.
        vm.deal(buyer, 110_000 ether);
        vm.prank(buyer);
        curve.buy{value: 110_000 ether}(0);
        assertTrue(curve.graduated());

        // Attacker donates a huge amount of tokens to the precomputed CREATE2 pair address.
        address predicted = _predictPair(dex, tokenAddr, address(weth));
        // Buyer gives some tokens to the attacker to donate.
        vm.prank(buyer);
        token.transfer(attacker, 1_000_000 ether);
        vm.prank(attacker);
        token.transfer(predicted, 1_000_000 ether);
        assertEq(token.balanceOf(predicted), 1_000_000 ether);

        // Snapshot the curve's true liquidity for the expected opening price.
        uint256 curveMon = curve.realMon();
        uint256 curveTokens = token.balanceOf(curveAddr);

        // Migrate.
        address pair = router.migrateLiquidity(tokenAddr);
        assertEq(pair, predicted, "pair should match precomputed address");

        // The donated tokens must have been skimmed to 0xdead, NOT folded into reserves.
        (uint112 r0, uint112 r1,) = LickPair(pair).getReserves();
        address t0 = LickPair(pair).token0();
        (uint256 rToken, uint256 rMon) = t0 == tokenAddr ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));

        assertEq(rToken, curveTokens, "opening token reserve must equal curve snapshot only");
        assertEq(rMon, curveMon, "opening MON reserve must equal curve snapshot only");
        assertGe(token.balanceOf(address(0xdead)), 1_000_000 ether, "donation skimmed to dead");
    }

    function test_H04_cannot_resolve_during_open_window() public {
        Factory factory = new Factory(treasury);
        PredictionMarket pm = new PredictionMarket(treasury, address(this)); // this acts as factory
        MockCurveA mock = new MockCurveA();
        address token = address(mock);

        // Create market (caller must be the configured factory == this).
        pm.createMarket(token, address(mock));

        vm.deal(creator, 2 ether);
        vm.deal(attacker, 2 ether);
        vm.prank(creator);
        pm.betYes{value: 1 ether}(token);
        vm.prank(attacker);
        pm.betNo{value: 1 ether}(token);

        // Not graduated, window open → resolve must revert.
        mock.setGraduated(false);
        vm.expectRevert(bytes("WINDOW_OPEN"));
        pm.resolveMarket(token);

        // Early resolve IS allowed once graduated (terminal YES outcome).
        mock.setGraduated(true);
        pm.resolveMarket(token);
        (,,,, bool resolved, bool outcome,,) = pm.markets(token);
        assertTrue(resolved);
        assertTrue(outcome);
    }

    // ─────────────────────────── M-02: CREATE2 already-deployed address ───────────────────────────

    function test_M02_createPair_reverts_if_address_taken() public {
        LickFactory dex = new LickFactory(address(this));
        StdToken a = new StdToken();
        StdToken b = new StdToken();

        // First create succeeds.
        address pair = dex.createPair(address(a), address(b));
        assertTrue(pair != address(0));

        // Re-creating the same pair must revert (PairExists guard) — and crucially the
        // CREATE2 slot is occupied, which the Create2Failed guard would also catch.
        vm.expectRevert(LickFactory.PairExists.selector);
        dex.createPair(address(a), address(b));
    }

    // ─────────────────────────── M-03: non-standard ERC20 in LickPair ───────────────────────────

    function test_M03_safeTransfer_rejects_bad_token() public {
        LickFactory dex = new LickFactory(address(this));
        StdToken good = new StdToken();
        BadToken bad = new BadToken();

        address pair = dex.createPair(address(good), address(bad));

        // Seed liquidity so a swap can be attempted.
        good.mint(pair, 1_000 ether);
        bad.mint(pair, 1_000 ether);
        LickPair(pair).sync();

        // Determine which side is the bad token.
        bool badIsToken0 = LickPair(pair).token0() == address(bad);

        // Provide input of the good token, request output of the bad token.
        good.mint(address(this), 10 ether);
        good.transfer(pair, 10 ether);

        (uint256 out0, uint256 out1) = badIsToken0 ? (uint256(1 ether), uint256(0)) : (uint256(0), uint256(1 ether));

        // The bad token's transfer returns false → SafeERC20 must revert the swap.
        vm.expectRevert();
        LickPair(pair).swap(out0, out1, address(this), new bytes(0));
    }

    // ─────────────────────────── Parimutuel solvency fuzz ───────────────────────────

    function testFuzz_parimutuel_solvent(uint96[8] memory yesAmts, uint96[8] memory noAmts) public {
        Factory factory = new Factory(treasury);
        PredictionMarket pm = new PredictionMarket(treasury, address(this));
        MockCurveA mock = new MockCurveA();
        address token = address(mock);
        pm.createMarket(token, address(mock));

        address[8] memory yesBettors;
        address[8] memory noBettors;
        uint256 totalYes;
        uint256 totalNo;

        for (uint256 i = 0; i < 8; i++) {
            uint256 y = uint256(yesAmts[i]) % 100 ether;
            uint256 n = uint256(noAmts[i]) % 100 ether;
            if (y > 0) {
                yesBettors[i] = makeAddr(string(abi.encodePacked("y", vm.toString(i))));
                vm.deal(yesBettors[i], y);
                vm.prank(yesBettors[i]);
                pm.betYes{value: y}(token);
                totalYes += y;
            }
            if (n > 0) {
                noBettors[i] = makeAddr(string(abi.encodePacked("n", vm.toString(i))));
                vm.deal(noBettors[i], n);
                vm.prank(noBettors[i]);
                pm.betNo{value: n}(token);
                totalNo += n;
            }
        }

        // Need at least one bet on each side to resolve.
        if (totalYes == 0 || totalNo == 0) return;

        // Resolve as YES (graduated).
        mock.setGraduated(true);
        pm.resolveMarket(token);

        uint256 startBalance = address(pm).balance;
        assertEq(startBalance, totalYes + totalNo, "contract holds all stakes");

        // All winners (YES) claim in order. Contract must never run dry.
        uint256 totalPaid;
        for (uint256 i = 0; i < 8; i++) {
            if (yesBettors[i] != address(0)) {
                uint256 before = yesBettors[i].balance;
                vm.prank(yesBettors[i]);
                pm.claimWinnings(token);
                totalPaid += yesBettors[i].balance - before;
            }
        }

        // Sweep the protocol fee.
        pm.sweepProtocolFee(token);

        // Invariant: payouts + fee == losing pool; winning pool stays locked.
        // So total leaving the contract <= totalNo, and the contract never underflowed.
        assertLe(totalPaid, totalNo, "payouts cannot exceed losing pool");
        assertGe(address(pm).balance, totalYes, "winning pool remains locked");
    }
}
