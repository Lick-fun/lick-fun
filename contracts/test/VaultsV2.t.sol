// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "forge-std/Test.sol";
import "../src/VaultBuybackBurn.sol";
import "../src/VaultLPSupport.sol";

/* ════════════════════════════════ MOCKS ═══════════════════════════════════ */

/// @dev Minimal ERC20 with public burn (mimics LickToken).
contract MockToken {
    string public name = "Mock";
    string public symbol = "MOCK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amt) external {
        balanceOf[to] += amt;
        totalSupply += amt;
    }
    function transfer(address to, uint256 amt) external returns (bool) {
        balanceOf[msg.sender] -= amt;
        balanceOf[to] += amt;
        return true;
    }
    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        allowance[from][msg.sender] -= amt;
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
        return true;
    }
    function approve(address sp, uint256 amt) external returns (bool) {
        allowance[msg.sender][sp] = amt;
        return true;
    }
    function burn(uint256 amt) external {
        balanceOf[msg.sender] -= amt;
        totalSupply -= amt;
    }
}

/// @dev Mock BondingCurve: buy() mints tokens 1:1000 to caller and bumps realMon.
contract MockCurve {
    MockToken public tok;
    uint256 public realMon;
    bool public graduated;
    uint256 public constant GRADUATION_THRESHOLD = 100_000 ether;

    constructor(MockToken _tok) { tok = _tok; }
    function setGraduated(bool g) external { graduated = g; }
    function setRealMon(uint256 r) external { realMon = r; }

    function getAmountOut(uint256 amountIn, bool) external pure returns (uint256) {
        return amountIn * 1000; // 1 MON → 1000 tokens
    }
    function buy(uint256 minTokensOut) external payable returns (uint256 tokensOut) {
        tokensOut = msg.value * 1000;
        require(tokensOut >= minTokensOut, "SLIPPAGE");
        realMon += msg.value;
        tok.mint(msg.sender, tokensOut);
    }
}

/// @dev Malicious curve that steals MON and returns 0 tokens (C-01 attack).
contract EvilCurve {
    uint256 public realMon;
    bool public graduated;
    uint256 public constant GRADUATION_THRESHOLD = 100_000 ether;
    address public attacker;
    constructor(address _attacker) { attacker = _attacker; }
    function getAmountOut(uint256, bool) external pure returns (uint256) { return 0; }
    function buy(uint256) external payable returns (uint256) {
        (bool ok,) = attacker.call{value: msg.value}(""); // steal
        ok;
        return 0;
    }
}

/// @dev Mock Factory mapping token → curve.
contract MockFactory {
    mapping(address => address) public tokenToCurve;
    function setCurve(address token, address curve) external { tokenToCurve[token] = curve; }
}

/// @dev Mock GraduationRouter mapping token → pair.
contract MockGradRouter {
    mapping(address => address) public tokenToPair;
    function setPair(address token, address pair) external { tokenToPair[token] = pair; }
}

/* ════════════════════════════════ TESTS ═══════════════════════════════════ */

contract VaultsV2Test is Test {
    MockToken token;
    MockCurve curve;
    MockFactory factory;
    MockGradRouter grad;
    VaultBuybackBurn vaultBB;

    address owner = makeAddr("owner");
    address attacker = makeAddr("attacker");

    function setUp() public {
        token = new MockToken();
        curve = new MockCurve(token);
        factory = new MockFactory();
        grad = new MockGradRouter();
        factory.setCurve(address(token), address(curve));

        // lickRouter unused in pre-graduation path — use a dummy
        vaultBB = new VaultBuybackBurn(owner, address(0x12345), address(factory), address(grad));
    }

    // ─── C-01: arbitrary curve param is now ignored ────────────────────────────

    function test_C01_execute_uses_factory_curve_not_caller() public {
        // Accumulate 60 MON for the token
        vm.deal(address(this), 60 ether);
        vaultBB.receiveForToken{value: 60 ether}(address(token));

        // Anyone calls execute(token) — vault resolves the REAL curve from factory.
        // An attacker cannot supply a malicious curve anymore (param removed).
        vaultBB.execute(address(token));

        // Vault bought 60 * 1000 = 60,000 tokens then burned them → balance 0.
        assertEq(token.balanceOf(address(vaultBB)), 0, "tokens should be burned");
        assertEq(vaultBB.pendingBurn(address(token)), 0, "pending cleared");
    }

    function test_C01_evilCurve_cannot_steal() public {
        // Even if an EvilCurve is the registered curve, it can only affect ITS OWN token.
        // The vault never lets a caller point a legit token's funds at an arbitrary curve.
        EvilCurve evil = new EvilCurve(attacker);
        MockToken evilToken = new MockToken();
        factory.setCurve(address(evilToken), address(evil));

        vm.deal(address(this), 60 ether);
        vaultBB.receiveForToken{value: 60 ether}(address(evilToken));

        // Executing the evil token only spends the evil token's own pending balance.
        // The legit `token` pending is untouched.
        vaultBB.receiveForToken{value: 0}(address(token));
        vm.deal(address(this), 60 ether);
        vaultBB.receiveForToken{value: 60 ether}(address(token));

        uint256 legitPendingBefore = vaultBB.pendingBurn(address(token));
        vaultBB.execute(address(evilToken)); // evil drains only its own 60 MON
        assertEq(vaultBB.pendingBurn(address(token)), legitPendingBefore, "legit token funds untouched");
    }

    function test_execute_reverts_unknown_token() public {
        MockToken unknown = new MockToken();
        vm.deal(address(this), 60 ether);
        vaultBB.receiveForToken{value: 60 ether}(address(unknown));
        // No curve registered → UnknownToken
        vm.expectRevert(VaultBuybackBurn.UnknownToken.selector);
        vaultBB.execute(address(unknown));
    }

    // ─── Threshold ─────────────────────────────────────────────────────────────

    function test_execute_below_threshold_reverts() public {
        vm.deal(address(this), 10 ether);
        vaultBB.receiveForToken{value: 10 ether}(address(token));
        vm.expectRevert(VaultBuybackBurn.BelowThreshold.selector);
        vaultBB.execute(address(token));
    }

    // ─── NearGraduation guard ────────────────────────────────────────────────

    function test_nearGraduation_blocks_and_preserves_funds() public {
        // Set realMon very close to graduation threshold.
        curve.setRealMon(99_900 ether); // within 1% margin (1000 MON)
        vm.deal(address(this), 60 ether);
        vaultBB.receiveForToken{value: 60 ether}(address(token));

        vm.expectRevert(VaultBuybackBurn.NearGraduation.selector);
        vaultBB.execute(address(token));

        // Funds NOT lost — still pending after revert.
        assertEq(vaultBB.pendingBurn(address(token)), 60 ether, "funds preserved on revert");
    }

    // ─── C-02: slippage min-out enforced ───────────────────────────────────────

    function test_C02_slippage_default_500bps() public view {
        assertEq(vaultBB.maxSlippageBps(), 500, "default 5% slippage");
    }

    function test_setMaxSlippage_onlyOwner_and_capped() public {
        vm.prank(attacker);
        vm.expectRevert(VaultBuybackBurn.NotOwner.selector);
        vaultBB.setMaxSlippage(100);

        vm.prank(owner);
        vm.expectRevert(VaultBuybackBurn.InvalidSlippage.selector);
        vaultBB.setMaxSlippage(2001); // > 20% cap

        vm.prank(owner);
        vaultBB.setMaxSlippage(300);
        assertEq(vaultBB.maxSlippageBps(), 300);
    }

    // ─── Constructor zero-address guards ───────────────────────────────────────

    function test_constructor_rejects_zero() public {
        vm.expectRevert(VaultBuybackBurn.ZeroAddress.selector);
        new VaultBuybackBurn(address(0), address(0x1), address(0x2), address(0x3));
        vm.expectRevert(VaultBuybackBurn.ZeroAddress.selector);
        new VaultBuybackBurn(owner, address(0), address(0x2), address(0x3));
        vm.expectRevert(VaultBuybackBurn.ZeroAddress.selector);
        new VaultBuybackBurn(owner, address(0x1), address(0), address(0x3));
        vm.expectRevert(VaultBuybackBurn.ZeroAddress.selector);
        new VaultBuybackBurn(owner, address(0x1), address(0x2), address(0));
    }

    // ─── Sweep ───────────────────────────────────────────────────────────────

    function test_sweep_onlyOwner() public {
        vm.deal(address(this), 60 ether);
        vaultBB.receiveForToken{value: 60 ether}(address(token));

        vm.prank(attacker);
        vm.expectRevert(VaultBuybackBurn.NotOwner.selector);
        vaultBB.sweep(attacker, 60 ether);

        vm.prank(owner);
        vaultBB.sweep(owner, 60 ether);
        assertEq(owner.balance, 60 ether);
    }
}
