# ArcSubs

Onchain subscription payments protocol built on Arc Testnet.

ArcSubs lets merchants create recurring USDC payment plans and charge subscribers automatically — no intermediaries, sub-second finality.

## Live Demo

- Frontend: https://arcsubs.vercel.app
- Contract: 0x9c8fAc607DA5b65f4ec110fC2d2c2F0fD5A00819
- Explorer: https://testnet.arcscan.app/address/0x9c8fAc607DA5b65f4ec110fC2d2c2F0fD5A00819
- Network: Arc Testnet (Chain ID: 5042002)

## What it does

ArcSubs is the subscription payment primitive of Arc. Like Stripe Billing, but fully onchain — no intermediaries, no bank accounts, no waiting days to receive funds.

- Merchants create subscription plans with a name, USDC price, and billing interval
- Subscribers approve USDC once and get charged automatically each period
- Keeper bot runs permissionlessly — detects due subscriptions and executes batch charges
- Failed charges enter a 7-day grace period before a subscription is cancelled for non-payment

## Features

### Merchant

- Create, pause and resume subscription plans
- Dashboard with estimated MRR, active plans and subscriber count
- View subscribers per plan with wallet address, join date and total paid
- Public store page at /merchant/0x... shareable with name, description and avatar stored onchain
- Edit profile onchain (name, description, avatar URL)

### Subscriber

- Browse available plans and subscribe with one-time USDC approval
- View active subscriptions with next charge date and days remaining
- Payment history with plan names and links to ArcScan
- Low balance alert when a charge is due within 3 days
- Cancel anytime, with a clear summary before confirming (no refunds for the current period)
- Past-due alerts: if a charge fails, access is preserved during a 7-day grace period, with a visible deadline to top up USDC
- Subscriptions cancelled for non-payment after the grace period can be restarted with one click (if the plan is still active)
- Per-subscription event timeline: subscribed, charged, payment issues, reactivations and cancellations, all read directly from onchain events
- Shareable payment receipts at /receipt/0x[txHash], showing plan, amount, payer, merchant and a link to ArcScan

### Protocol

- Permissionless keeper bot using Multicall3 for batch charges
- Failed charges don't revert — they mark a subscription past-due so the keeper can keep retrying within the grace period
- All merchant profiles stored onchain — no centralized database
- Every payment verifiable on ArcScan

## Use cases

- SaaS products charging monthly in USDC
- DAOs collecting membership fees onchain
- Creators monetizing without Web2 middlemen

## Why Arc

Arc uses USDC as native gas, making fee costs stable and predictable — essential for automating recurring charges. Sub-second finality means subscribers know instantly when their subscription is active. These properties make Arc the ideal chain for a recurring payments protocol.

## Repo structure

- contracts/ — Solidity smart contract (Foundry)
- frontend/ — Next.js dApp (Wagmi + Viem)
- keeper/ — Node.js keeper bot (Viem)

## Contracts

- SubscriptionManager: 0x9c8fAc607DA5b65f4ec110fC2d2c2F0fD5A00819
- USDC (Arc Testnet): 0x3600000000000000000000000000000000000000

### Subscription lifecycle

- **active** — subscription is current, charges happen on schedule
- **pastDue** — a charge failed (insufficient balance or allowance); access is preserved for a 7-day grace period (`GRACE_PERIOD`) while the keeper keeps retrying
- **suspended** — the grace period expired without a successful charge; access is revoked and the subscriber can subscribe again to restart
- **cancelled** — the subscriber cancelled voluntarily; no refund for the current period

## Arc Testnet config

- Chain ID: 5042002
- RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app
- Gas token: USDC

## Tests

26/26 passing — unit tests, edge cases, fuzz testing, and the full pastDue/suspended/reactivation lifecycle.

## Built with

- Arc Testnet — stablecoin-native L1
- Foundry — smart contract development
- Viem — Ethereum interface
- Wagmi — React hooks for Ethereum
- Next.js — frontend framework

## Roadmap / known limitations

- The event timeline and receipt pages read logs directly via `eth_getLogs` in chunks. This works well at the current scale, but as transaction volume grows this should move to an indexer (e.g. The Graph, Ponder, or a dedicated backend) for performance and reliability on mainnet.

## Author

Built by @mauriciochaju24 (altair478) on Arc Testnet.
