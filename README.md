# ArcSubs

Onchain subscription payments protocol built on Arc Testnet.

ArcSubs lets merchants create recurring USDC payment plans and charge subscribers automatically — no intermediaries, sub-second finality.

## Live Demo

- Frontend: https://arcsubs.vercel.app
- Contract: 0xBB5004Bf24B5E21262F1610F7748bB967f583EB0
- Explorer: https://testnet.arcscan.app/address/0xBB5004Bf24B5E21262F1610F7748bB967f583EB0
- Network: Arc Testnet (Chain ID: 5042002)

## What it does

ArcSubs is the subscription payment primitive of Arc. Like Stripe Billing, but fully onchain — no intermediaries, no bank accounts, no waiting days to receive funds.

- Merchants create subscription plans with a name, USDC price, and billing interval
- Subscribers approve USDC once and get charged automatically each period
- Keeper bot runs permissionlessly — detects due subscriptions and executes batch charges

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
- Cancel anytime

### Protocol
- Permissionless keeper bot using Multicall3 for batch charges
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

- SubscriptionManager: 0xBB5004Bf24B5E21262F1610F7748bB967f583EB0
- USDC (Arc Testnet): 0x3600000000000000000000000000000000000000

## Arc Testnet config

- Chain ID: 5042002
- RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app
- Gas token: USDC

## Tests

19/19 passing — unit tests, edge cases, and fuzz testing.

## Built with

- Arc Testnet — stablecoin-native L1
- Foundry — smart contract development
- Viem — Ethereum interface
- Wagmi — React hooks for Ethereum
- Next.js — frontend framework

## Author

Built by @mauriciochaju24 (altair478) on Arc Testnet.
