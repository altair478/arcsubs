    // SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SubscriptionManager.sol";

// Mock USDC ERC-20 para testing local
contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function burn(address from, uint256 amount) external {
        balanceOf[from] -= amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        balanceOf[from] -= amount;
        allowance[from][msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract SubscriptionManagerTest is Test {

    SubscriptionManager public manager;
    MockUSDC           public usdc;

    address merchant   = makeAddr("merchant");
    address subscriber = makeAddr("subscriber");
    address keeper     = makeAddr("keeper");
    address stranger   = makeAddr("stranger");

    uint256 constant PRICE    = 10e6;  // 10 USDC
    uint256 constant INTERVAL = 30 days;

    function setUp() public {
        // Deployamos el mock de USDC y lo inyectamos en la dirección que usa el contrato
        usdc = new MockUSDC();
        vm.etch(0x3600000000000000000000000000000000000000, address(usdc).code);
        usdc = MockUSDC(0x3600000000000000000000000000000000000000);

        manager = new SubscriptionManager();

        // Fondear subscriber con 100 USDC
        usdc.mint(subscriber, 100e6);
    }

    // ─── Plan Tests ───────────────────────────────────────────────────────────

    function test_CreatePlan() public {
        vm.prank(merchant);
        uint256 planId = manager.createPlan("Pro Plan", PRICE, INTERVAL);

        (
            uint256 id,
            address merch,
            string memory name,
            uint256 price,
            uint256 interval,
            bool active
        ) = manager.plans(planId);

        assertEq(id, 0);
        assertEq(merch, merchant);
        assertEq(name, "Pro Plan");
        assertEq(price, PRICE);
        assertEq(interval, INTERVAL);
        assertTrue(active);
    }

    function test_RevertIf_CreatePlan_ZeroPrice() public {
        vm.prank(merchant);
        vm.expectRevert(SubscriptionManager.InvalidPrice.selector);
        manager.createPlan("Bad Plan", 0, INTERVAL);
    }

    function test_RevertIf_CreatePlan_ZeroInterval() public {
        vm.prank(merchant);
        vm.expectRevert(SubscriptionManager.InvalidInterval.selector);
        manager.createPlan("Bad Plan", PRICE, 0);
    }

    function test_PausePlan() public {
        vm.prank(merchant);
        uint256 planId = manager.createPlan("Pro Plan", PRICE, INTERVAL);

        vm.prank(merchant);
        manager.pausePlan(planId);

        (,,,,,bool active) = manager.plans(planId);
        assertFalse(active);
    }

    function test_RevertIf_PausePlan_NotMerchant() public {
        vm.prank(merchant);
        uint256 planId = manager.createPlan("Pro Plan", PRICE, INTERVAL);

        vm.prank(stranger);
        vm.expectRevert(SubscriptionManager.NotMerchant.selector);
        manager.pausePlan(planId);
    }

    function test_ResumePlan() public {
        vm.prank(merchant);
        uint256 planId = manager.createPlan("Pro Plan", PRICE, INTERVAL);

        vm.prank(merchant);
        manager.pausePlan(planId);

        vm.prank(merchant);
        manager.resumePlan(planId);

        (,,,,,bool active) = manager.plans(planId);
        assertTrue(active);
    }

    // ─── Subscription Tests ───────────────────────────────────────────────────

    function _createPlanAndSubscribe() internal returns (uint256 planId, uint256 subId) {
        vm.prank(merchant);
        planId = manager.createPlan("Pro Plan", PRICE, INTERVAL);

        vm.prank(subscriber);
        usdc.approve(address(manager), type(uint256).max);

        vm.prank(subscriber);
        subId = manager.subscribe(planId);
    }

    function test_Subscribe_ChargesImmediately() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        // Subscriber pagó 10 USDC al suscribirse
        assertEq(usdc.balanceOf(subscriber), 90e6);
        assertEq(usdc.balanceOf(merchant), 10e6);

        (,,,,,uint256 totalPaid, bool active,,,) = manager.subscriptions(subId);
        assertEq(totalPaid, PRICE);
        assertTrue(active);
    }

    function test_RevertIf_Subscribe_PlanPaused() public {
        vm.prank(merchant);
        uint256 planId = manager.createPlan("Pro Plan", PRICE, INTERVAL);

        vm.prank(merchant);
        manager.pausePlan(planId);

        vm.prank(subscriber);
        usdc.approve(address(manager), type(uint256).max);

        vm.prank(subscriber);
        vm.expectRevert(SubscriptionManager.PlanNotActive.selector);
        manager.subscribe(planId);
    }

    function test_RevertIf_Subscribe_InsufficientAllowance() public {
        vm.prank(merchant);
        uint256 planId = manager.createPlan("Pro Plan", PRICE, INTERVAL);

        // Sin approve
        vm.prank(subscriber);
        vm.expectRevert(SubscriptionManager.InsufficientAllowance.selector);
        manager.subscribe(planId);
    }

    function test_Cancel() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.prank(subscriber);
        manager.cancel(subId);

        (,,,,,,bool active,,,) = manager.subscriptions(subId);
        assertFalse(active);
    }

    function test_RevertIf_Cancel_NotSubscriber() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.prank(stranger);
        vm.expectRevert(SubscriptionManager.NotSubscriber.selector);
        manager.cancel(subId);
    }

    // ─── Charge Tests ─────────────────────────────────────────────────────────

    function test_Charge_AfterInterval() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        // Avanzamos 30 días
        vm.warp(block.timestamp + INTERVAL);

        vm.prank(keeper);
        manager.charge(subId);

        assertEq(usdc.balanceOf(subscriber), 80e6);
        assertEq(usdc.balanceOf(merchant), 20e6);
    }

    function test_RevertIf_Charge_NotDueYet() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        // Solo avanzamos 1 día
        vm.warp(block.timestamp + 1 days);

        vm.prank(keeper);
        vm.expectRevert(SubscriptionManager.NotDueYet.selector);
        manager.charge(subId);
    }

    function test_RevertIf_Charge_Cancelled() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.prank(subscriber);
        manager.cancel(subId);

        vm.warp(block.timestamp + INTERVAL);

        vm.prank(keeper);
        vm.expectRevert(SubscriptionManager.SubNotActive.selector);
        manager.charge(subId);
    }

    function test_ChargeMany() public {
        // Creamos dos suscriptores
        address subscriber2 = makeAddr("subscriber2");
        usdc.mint(subscriber2, 100e6);

        vm.prank(merchant);
        uint256 planId = manager.createPlan("Pro Plan", PRICE, INTERVAL);

        vm.prank(subscriber);
        usdc.approve(address(manager), type(uint256).max);
        vm.prank(subscriber);
        uint256 subId1 = manager.subscribe(planId);

        vm.prank(subscriber2);
        usdc.approve(address(manager), type(uint256).max);
        vm.prank(subscriber2);
        uint256 subId2 = manager.subscribe(planId);

        vm.warp(block.timestamp + INTERVAL);

        uint256[] memory ids = new uint256[](2);
        ids[0] = subId1;
        ids[1] = subId2;

        vm.prank(keeper);
        manager.chargeMany(ids);

        assertEq(usdc.balanceOf(merchant), 40e6); // 4 cobros de 10 USDC
    }

    // ─── View Tests ───────────────────────────────────────────────────────────

    function test_GetMerchantPlans() public {
        vm.startPrank(merchant);
        manager.createPlan("Plan A", PRICE, INTERVAL);
        manager.createPlan("Plan B", PRICE * 2, INTERVAL);
        vm.stopPrank();

        SubscriptionManager.Plan[] memory result = manager.getMerchantPlans(merchant);
        assertEq(result.length, 2);
        assertEq(result[0].name, "Plan A");
        assertEq(result[1].name, "Plan B");
    }

    function test_GetSubscriberSubs() public {
        _createPlanAndSubscribe();

        SubscriptionManager.Subscription[] memory result = manager.getSubscriberSubs(subscriber);
        assertEq(result.length, 1);
        assertEq(result[0].subscriber, subscriber);
    }

    function test_GetChargeable() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.warp(block.timestamp + INTERVAL);

        uint256[] memory chargeable = manager.getChargeable(0, manager.nextSubId());
        assertEq(chargeable.length, 1);
        assertEq(chargeable[0], subId);
    }

    // ─── Fuzz Tests ───────────────────────────────────────────────────────────

    function testFuzz_CreatePlan(uint256 price, uint256 interval) public {
        price    = bound(price, 1, 1_000_000e6);
        interval = bound(interval, 1, 365 days);

        vm.prank(merchant);
        uint256 planId = manager.createPlan("Fuzz Plan", price, interval);

        (,, , uint256 p, uint256 i,) = manager.plans(planId);
        assertEq(p, price);
        assertEq(i, interval);
    }

    // ─── Low-Balance Retry / pastDue / suspended Tests ─────────────────────────

    function test_Charge_MarksPastDue_WhenInsufficientBalance() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.warp(block.timestamp + INTERVAL);

        // Subscriber se queda sin saldo: ya no le alcanza para el cobro
        usdc.burn(subscriber, 90e6); // se queda con 0

        vm.prank(keeper);
        manager.charge(subId); // no debe revertir

        (
            ,,,, uint256 nextChargeAt, uint256 totalPaid,
            bool active, bool pastDue, bool suspended, uint256 graceStartedAt
        ) = manager.subscriptions(subId);

        assertTrue(active);          // mantiene acceso
        assertTrue(pastDue);         // marcado como pastDue
        assertFalse(suspended);
        assertEq(graceStartedAt, block.timestamp);
        assertEq(totalPaid, PRICE);  // no se cobró nada nuevo
        assertEq(nextChargeAt, block.timestamp); // no avanzó nextChargeAt
    }

    function test_Charge_StaysPastDue_WithinGracePeriod() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.warp(block.timestamp + INTERVAL);

        usdc.burn(subscriber, 90e6);

        vm.prank(keeper);
        manager.charge(subId); // marca pastDue

        // Avanzamos 3 días (dentro de los 7 de gracia) y reintenta
        vm.warp(block.timestamp + 3 days);

        vm.prank(keeper);
        manager.charge(subId); // sigue sin fondos, sigue dentro de gracia

        (,,,,,, bool active, bool pastDue, bool suspended,) = manager.subscriptions(subId);

        assertTrue(active);
        assertTrue(pastDue);
        assertFalse(suspended); // todavía no se cumplieron los 7 días
    }

    function test_Charge_Suspends_AfterGracePeriodExpires() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.warp(block.timestamp + INTERVAL);

        usdc.burn(subscriber, 90e6);

        vm.prank(keeper);
        manager.charge(subId); // marca pastDue, graceStartedAt = T

        // Avanzamos más de 7 días desde que empezó la gracia
        vm.warp(block.timestamp + manager.GRACE_PERIOD() + 1);

        vm.prank(keeper);
        manager.charge(subId); // gracia vencida, sin fondos -> suspende

        (,,,,,, bool active, bool pastDue, bool suspended,) = manager.subscriptions(subId);

        assertFalse(active);   // se corta el acceso
        assertTrue(pastDue);
        assertTrue(suspended);
    }

    function test_Charge_Reactivates_WhenFundsReturnDuringGrace() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.warp(block.timestamp + INTERVAL);

        // Se queda sin fondos
        usdc.burn(subscriber, 90e6);

        vm.prank(keeper);
        manager.charge(subId); // marca pastDue

        // Avanzamos 2 días, todavía dentro de gracia
        vm.warp(block.timestamp + 2 days);

        // El subscriber recupera fondos suficientes
        usdc.mint(subscriber, 50e6);

        vm.prank(keeper);
        manager.charge(subId); // ahora sí cobra y reactiva

        (
            ,,,, uint256 nextChargeAt, uint256 totalPaid,
            bool active, bool pastDue, bool suspended, uint256 graceStartedAt
        ) = manager.subscriptions(subId);

        assertTrue(active);
        assertFalse(pastDue);
        assertFalse(suspended);
        assertEq(graceStartedAt, 0);
        assertEq(totalPaid, PRICE * 2); // cobro inicial + este cobro
        assertEq(nextChargeAt, block.timestamp + INTERVAL);
    }

    function test_RevertIf_Charge_Suspended() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.warp(block.timestamp + INTERVAL);

        usdc.burn(subscriber, 90e6);

        vm.prank(keeper);
        manager.charge(subId); // pastDue

        vm.warp(block.timestamp + manager.GRACE_PERIOD() + 1);

        vm.prank(keeper);
        manager.charge(subId); // suspende

        // Un intento posterior sobre una sub suspendida revierte como SubNotActive
        vm.warp(block.timestamp + 1 days);

        vm.prank(keeper);
        vm.expectRevert(SubscriptionManager.SubNotActive.selector);
        manager.charge(subId);
    }

    function test_GetChargeable_IncludesPastDueSubs() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.warp(block.timestamp + INTERVAL);

        usdc.burn(subscriber, 90e6);

        vm.prank(keeper);
        manager.charge(subId); // pastDue, nextChargeAt no avanza

        // Sigue apareciendo como chargeable para que el keeper reintente
        uint256[] memory chargeable = manager.getChargeable(0, manager.nextSubId());
        assertEq(chargeable.length, 1);
        assertEq(chargeable[0], subId);
    }

    function test_GetChargeable_ExcludesSuspendedSubs() public {
        (, uint256 subId) = _createPlanAndSubscribe();

        vm.warp(block.timestamp + INTERVAL);

        usdc.burn(subscriber, 90e6);

        vm.prank(keeper);
        manager.charge(subId); // pastDue

        vm.warp(block.timestamp + manager.GRACE_PERIOD() + 1);

        vm.prank(keeper);
        manager.charge(subId); // suspende (active = false)

        uint256[] memory chargeable = manager.getChargeable(0, manager.nextSubId());
        assertEq(chargeable.length, 0);
    }
}
