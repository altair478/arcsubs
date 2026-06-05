import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import "dotenv/config";

// ─── Arc Testnet config ───────────────────────────────────────────────────────
const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { decimals: 18, name: "USDC", symbol: "USDC" },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
});

const SUBSCRIPTION_MANAGER = "0xd8bD4089f428dbBE3f3719fE118F026Bba5C84a4";

const ABI = parseAbi([
  "function nextSubId() view returns (uint256)",
  "function getChargeable(uint256 fromId, uint256 toId) view returns (uint256[])",
  "function chargeMany(uint256[] calldata subIds) external",
]);

// ─── Clients ──────────────────────────────────────────────────────────────────
const account = privateKeyToAccount(process.env.PRIVATE_KEY_KEEPER);

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain: arcTestnet,
  transport: http(),
});

// ─── Main loop ────────────────────────────────────────────────────────────────
async function runKeeper() {
  console.log("ArcPay Keeper Bot started");
  console.log("Keeper address:", account.address);
  console.log("Contract:", SUBSCRIPTION_MANAGER);
  console.log("Polling every 60 seconds...\n");

  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error("Error in keeper tick:", err.message);
    }
    await sleep(60_000);
  }
}

async function tick() {
  const now = new Date().toISOString();
  console.log(`[${now}] Checking for chargeable subscriptions...`);

  // Get total number of subscriptions
  const nextSubId = await publicClient.readContract({
    address: SUBSCRIPTION_MANAGER,
    abi: ABI,
    functionName: "nextSubId",
  });

  if (nextSubId === 0n) {
    console.log("  No subscriptions yet.\n");
    return;
  }

  // Get chargeable subscription IDs
  const chargeable = await publicClient.readContract({
    address: SUBSCRIPTION_MANAGER,
    abi: ABI,
    functionName: "getChargeable",
    args: [0n, nextSubId],
  });

  console.log(`  Total subs: ${nextSubId} | Chargeable: ${chargeable.length}`);

  if (chargeable.length === 0) {
    console.log("  Nothing to charge.\n");
    return;
  }

  console.log("  Charging sub IDs:", chargeable.map(String).join(", "));

  // Execute chargeMany
  const hash = await walletClient.writeContract({
    address: SUBSCRIPTION_MANAGER,
    abi: ABI,
    functionName: "chargeMany",
    args: [chargeable],
  });

  console.log("  TX sent:", hash);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("  Confirmed in block:", receipt.blockNumber.toString());
  console.log("  Gas used (USDC):", receipt.gasUsed.toString(), "\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

runKeeper();
