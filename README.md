# ArcSubs

Onchain subscription payments protocol built on Arc Testnet.

ArcSubs lets merchants create recurring USDC payment plans and charge subscribers automatically — no intermediaries, sub-second finality.

## Live Demo

- **Frontend:** (coming soon — Vercel)
- **Contract:** `0xd8bD4089f428dbBE3f3719fE118F026Bba5C84a4`
- **Explorer:** https://testnet.arcscan.app/address/0xd8bD4089f428dbBE3f3719fE118F026Bba5C84a4
- **Network:** Arc Testnet (Chain ID: 5042002)

## What it does

- **Merchants** create subscription plans with a name, USDC price, and billing interval
- **Subscribers** approve USDC once and get charged automatically each period
- **Keeper bot** runs permissionlessly — detects due subscriptions and executes batch charges

## Use cases

- SaaS products charging monthly in USDC
- DAOs collecting membership fees onchain
- Creators monetizing without Web2 intermediaries

## Why Arc

Arc uses USDC as native gas, making fee costs stable and predictable. Sub-second finality means subscribers know instantly when their subscription is active. These properties make Arc the ideal chain for a recurring payments protocol.

## Repo structure

- `/contracts` — Solidity smart contract (Foundry)
- `/frontend` — Next.js dApp (Wagmi + Viem)
- `/keeper` — Node.js keeper bot (Viem)

## Contracts

| Contract | Address |
|----------|---------|
| SubscriptionManager | `0xd8bD4089f428dbBE3f3719fE118F026Bba5C84a4` |
| USDC (Arc Testnet) | `0x3600000000000000000000000000000000000000` |

## Arc Testnet config

| Field | Value |
|-------|-------|
| Chain ID | 5042002 |
| RPC | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Gas token | USDC |

## Setup

### Contracts

```bash
cd contracts
forge build
forge test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Keeper Bot

```bash
cd keeper
npm install
cp .env.example .env
# Add PRIVATE_KEY_KEEPER to .env
node index.js
```

## Tests

19/19 passing — unit tests, edge cases, and fuzz testing.
## Built with

- [Arc Testnet](https://arc.io) — stablecoin-native L1
- [Foundry](https://getfoundry.sh) — smart contract development
- [Viem](https://viem.sh) — Ethereum interface
- [Wagmi](https://wagmi.sh) — React hooks for Ethereum
- [Next.js](https://nextjs.org) — frontend framework
