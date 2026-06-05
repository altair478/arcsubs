// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

contract SubscriptionManager {

    // ─── Constants ───────────────────────────────────────────────────────────
    address public constant USDC = 0x3600000000000000000000000000000000000000;

    // ─── Types ───────────────────────────────────────────────────────────────
    struct Plan {
        uint256 id;
        address merchant;
        string  name;
        uint256 price;      // in USDC (6 decimals)
        uint256 interval;   // in seconds
        bool    active;
    }

    struct Subscription {
        uint256 id;
        uint256 planId;
        address subscriber;
        uint256 startedAt;
        uint256 nextChargeAt;
        uint256 totalPaid;
        bool    active;
    }

    // ─── Storage ─────────────────────────────────────────────────────────────
    uint256 public nextPlanId;
    uint256 public nextSubId;

    mapping(uint256 => Plan)         public plans;
    mapping(uint256 => Subscription) public subscriptions;

    // merchant  → list of plan IDs
    mapping(address => uint256[]) public merchantPlans;
    // subscriber → list of subscription IDs
    mapping(address => uint256[]) public subscriberSubs;

    // ─── Events ──────────────────────────────────────────────────────────────
    event PlanCreated(uint256 indexed planId, address indexed merchant, string name, uint256 price, uint256 interval);
    event PlanPaused(uint256 indexed planId);
    event PlanResumed(uint256 indexed planId);
    event Subscribed(uint256 indexed subId, uint256 indexed planId, address indexed subscriber);
    event Charged(uint256 indexed subId, uint256 amount);
    event Cancelled(uint256 indexed subId);

    // ─── Errors ──────────────────────────────────────────────────────────────
    error PlanNotFound();
    error PlanNotActive();
    error AlreadySubscribed();
    error NotSubscriber();
    error SubNotActive();
    error NotDueYet();
    error InsufficientAllowance();
    error InsufficientBalance();
    error NotMerchant();
    error InvalidPrice();
    error InvalidInterval();

    // ─── Plan Management ─────────────────────────────────────────────────────

    function createPlan(
        string calldata name,
        uint256 price,
        uint256 interval
    ) external returns (uint256 planId) {
        if (price == 0) revert InvalidPrice();
        if (interval == 0) revert InvalidInterval();

        planId = nextPlanId++;

        plans[planId] = Plan({
            id:       planId,
            merchant: msg.sender,
            name:     name,
            price:    price,
            interval: interval,
            active:   true
        });

        merchantPlans[msg.sender].push(planId);

        emit PlanCreated(planId, msg.sender, name, price, interval);
    }

    function pausePlan(uint256 planId) external {
        Plan storage plan = _getPlan(planId);
        if (plan.merchant != msg.sender) revert NotMerchant();
        plan.active = false;
        emit PlanPaused(planId);
    }

    function resumePlan(uint256 planId) external {
        Plan storage plan = _getPlan(planId);
        if (plan.merchant != msg.sender) revert NotMerchant();
        plan.active = true;
        emit PlanResumed(planId);
    }

    // ─── Subscription Management ──────────────────────────────────────────────

    function subscribe(uint256 planId) external returns (uint256 subId) {
        Plan storage plan = _getPlan(planId);
        if (!plan.active) revert PlanNotActive();

        // Check subscriber has enough allowance and balance for at least 1 charge
        IERC20 usdc = IERC20(USDC);
        if (usdc.allowance(msg.sender, address(this)) < plan.price) revert InsufficientAllowance();
        if (usdc.balanceOf(msg.sender) < plan.price) revert InsufficientBalance();

        subId = nextSubId++;

        subscriptions[subId] = Subscription({
            id:            subId,
            planId:        planId,
            subscriber:    msg.sender,
            startedAt:     block.timestamp,
            nextChargeAt:  block.timestamp,
            totalPaid:     0,
            active:        true
        });

        subscriberSubs[msg.sender].push(subId);

        emit Subscribed(subId, planId, msg.sender);

        // Charge immediately on subscribe
        _charge(subId);
    }

    function cancel(uint256 subId) external {
        Subscription storage sub = _getSub(subId);
        if (sub.subscriber != msg.sender) revert NotSubscriber();
        if (!sub.active) revert SubNotActive();

        sub.active = false;
        emit Cancelled(subId);
    }

    // ─── Charging (permissionless) ────────────────────────────────────────────

    function charge(uint256 subId) external {
        _charge(subId);
    }

    function chargeMany(uint256[] calldata subIds) external {
        for (uint256 i = 0; i < subIds.length; i++) {
            // We don't revert on individual failures so the batch continues
            try this.charge(subIds[i]) {} catch {}
        }
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getMerchantPlans(address merchant) external view returns (Plan[] memory) {
        uint256[] storage ids = merchantPlans[merchant];
        Plan[] memory result = new Plan[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = plans[ids[i]];
        }
        return result;
    }

    function getSubscriberSubs(address subscriber) external view returns (Subscription[] memory) {
        uint256[] storage ids = subscriberSubs[subscriber];
        Subscription[] memory result = new Subscription[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = subscriptions[ids[i]];
        }
        return result;
    }

    function getChargeable(uint256 fromId, uint256 toId) external view returns (uint256[] memory) {
        uint256 count = 0;
        uint256[] memory temp = new uint256[](toId - fromId);

        for (uint256 i = fromId; i < toId; i++) {
            Subscription storage sub = subscriptions[i];
            if (sub.active && block.timestamp >= sub.nextChargeAt) {
                temp[count++] = i;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        return result;
    }

    // ─── Internals ────────────────────────────────────────────────────────────

    function _charge(uint256 subId) internal {
        Subscription storage sub = _getSub(subId);
        if (!sub.active) revert SubNotActive();
        if (block.timestamp < sub.nextChargeAt) revert NotDueYet();

        Plan storage plan = plans[sub.planId];
        IERC20 usdc = IERC20(USDC);

        if (usdc.allowance(sub.subscriber, address(this)) < plan.price) revert InsufficientAllowance();
        if (usdc.balanceOf(sub.subscriber) < plan.price) revert InsufficientBalance();

        sub.nextChargeAt = block.timestamp + plan.interval;
        sub.totalPaid   += plan.price;

        bool ok = usdc.transferFrom(sub.subscriber, plan.merchant, plan.price);
        require(ok, "USDC transfer failed");

        emit Charged(subId, plan.price);
    }

    function _getPlan(uint256 planId) internal view returns (Plan storage) {
        if (planId >= nextPlanId) revert PlanNotFound();
        return plans[planId];
    }

    function _getSub(uint256 subId) internal view returns (Subscription storage) {
        if (subId >= nextSubId) revert SubNotActive();
        return subscriptions[subId];
    }
}
