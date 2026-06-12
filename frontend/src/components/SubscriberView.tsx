"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { formatUnits, maxUint256, parseEventLogs } from "viem";
import { SUBSCRIPTION_MANAGER, USDC_ADDRESS, arcTestnet } from "@/lib/wagmi";
import { SUBSCRIPTION_MANAGER_ABI, USDC_ABI } from "@/lib/abi";
import { CancelModal } from "./CancelModal";

function formatInterval(seconds: bigint): string {
  const s = Number(seconds);
  if (s >= 60 * 60 * 24 * 365) return "/ year";
  if (s >= 60 * 60 * 24 * 30) return "/ month";
  if (s >= 60 * 60 * 24 * 7) return "/ week";
  if (s >= 60 * 60 * 24) return "/ day";
  return "/ " + s + "s";
}

function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function daysUntil(timestamp: bigint): string {
  const days = Math.max(0, Math.floor((Number(timestamp) - Date.now() / 1000) / 86400));
  if (days === 0) return "today";
  if (days === 1) return "in 1 day";
  return "in " + days + " days";
}

function formatDateTime(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

// Block at which the v2 SubscriptionManager contract was deployed.
// Used as the starting point for historical event lookups.
const DEPLOY_BLOCK = BigInt(46476364);

type Plan = {
  id: bigint;
  merchant: string;
  name: string;
  price: bigint;
  interval: bigint;
  active: boolean;
};

type Subscription = {
  id: bigint;
  planId: bigint;
  subscriber: string;
  startedAt: bigint;
  nextChargeAt: bigint;
  totalPaid: bigint;
  active: boolean;
  pastDue: boolean;
  suspended: boolean;
  graceStartedAt: bigint;
};

// ─── Plan Name ────────────────────────────────────────────────────────────────

function PlanName({ planId }: { planId: string }) {
  const { data: plan } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "plans",
    args: [BigInt(planId)],
    chainId: arcTestnet.id,
  });

  if (!plan) return <span style={{ color: "#505070" }}>Plan #{planId}</span>;
  const [,, name] = plan as [bigint, string, string, bigint, bigint, boolean];
  return <span style={{ color: "#e8e8f0", fontWeight: 500 }}>{name}</span>;
}

// ─── Subscribe Flow ───────────────────────────────────────────────────────────

function SubscribeFlow({ plan }: { plan: Plan }) {
  const { address } = useAccount();

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [address!, SUBSCRIPTION_MANAGER],
    chainId: arcTestnet.id,
    query: { enabled: !!address, refetchInterval: 3000 },
  });

  const needsApproval = !allowance || allowance < plan.price;

  const { writeContract: approve, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { writeContract: subscribe, data: subHash, isPending: isSubPending } = useWriteContract();
  const { isLoading: isSubConfirming, isSuccess: isSubSuccess } = useWaitForTransactionReceipt({ hash: subHash });

  if (isSubSuccess) {
    return (
      <div style={{ textAlign: "center", padding: "10px", color: "#40c057", fontSize: 13, fontWeight: 500 }}>
        ✓ Subscribed successfully
      </div>
    );
  }

  const approved = isApproveSuccess || !needsApproval;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        {["Approve USDC", "Subscribe"].map((label, i) => {
          const done = i === 0 ? approved : isSubSuccess;
          const active = i === 0 ? !approved : approved;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 500,
                background: done ? "#40c057" : active ? "#3b5bdb" : "#1a1a2e",
                color: done || active ? "#fff" : "#505070",
                border: active ? "none" : "0.5px solid #2a2a45",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 11, color: done ? "#40c057" : active ? "#e8e8f0" : "#505070" }}>
                {label}
              </span>
              {i === 0 && <span style={{ color: "#303050", fontSize: 12 }}>→</span>}
            </div>
          );
        })}
      </div>

      {!approved && (
        <button
          onClick={() => approve({ address: USDC_ADDRESS, abi: USDC_ABI, functionName: "approve", args: [SUBSCRIPTION_MANAGER, maxUint256] })}
          disabled={isApprovePending || isApproveConfirming}
          style={{ width: "100%", padding: "9px", background: "#2a3a70", color: "#7eb3f5", border: "0.5px solid #3b5bdb", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: isApprovePending || isApproveConfirming ? "not-allowed" : "pointer", opacity: isApprovePending || isApproveConfirming ? 0.6 : 1 }}
        >
          {isApprovePending ? "Confirm in wallet..." : isApproveConfirming ? "Approving..." : "Approve USDC"}
        </button>
      )}

      <button
        onClick={() => subscribe({ address: SUBSCRIPTION_MANAGER, abi: SUBSCRIPTION_MANAGER_ABI, functionName: "subscribe", args: [plan.id] })}
        disabled={!approved || isSubPending || isSubConfirming}
        style={{ width: "100%", padding: "9px", background: approved ? "#3b5bdb" : "#1a1a2e", color: approved ? "#fff" : "#505070", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: approved && !isSubPending && !isSubConfirming ? "pointer" : "not-allowed", opacity: isSubPending || isSubConfirming ? 0.6 : 1 }}
      >
        {isSubPending ? "Confirm in wallet..." : isSubConfirming ? "Confirming on Arc..." : "Subscribe"}
      </button>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div style={{ background: "#0f0f1e", border: "0.5px solid #1a1a30", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#e8e8f0", marginBottom: 3 }}>{plan.name}</div>
          <div style={{ fontSize: 11, color: "#505070" }}>{plan.merchant.slice(0, 6)}...{plan.merchant.slice(-4)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: "#e8e8f0" }}>{formatUnits(plan.price, 6)} USDC</div>
          <div style={{ fontSize: 11, color: "#505070" }}>{formatInterval(plan.interval)}</div>
        </div>
      </div>
      {plan.active ? <SubscribeFlow plan={plan} /> : (
        <div style={{ textAlign: "center", fontSize: 12, color: "#505070", padding: "8px", background: "#080810", borderRadius: 8 }}>
          Plan paused by merchant
        </div>
      )}
    </div>
  );
}

// ─── Plan Loader ──────────────────────────────────────────────────────────────

function PlanLoader({ planId }: { planId: bigint }) {
  const { data: plan } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "plans",
    args: [planId],
    chainId: arcTestnet.id,
  });

  if (!plan) return null;
  const [id, merchant, name, price, interval, active] = plan as [bigint, string, string, bigint, bigint, boolean];
  return <PlanCard plan={{ id, merchant, name, price, interval, active }} />;
}

// ─── Low Balance Alert ────────────────────────────────────────────────────────

// ─── Resubscribe Modal ─────────────────────────────────────────────────────────

function ResubscribeModal({ planId, onClose }: { planId: string; onClose: () => void }) {
  const { data: plan } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "plans",
    args: [BigInt(planId)],
    chainId: arcTestnet.id,
  });

  const typedPlan = plan
    ? (() => {
        const [id, merchant, name, price, interval, active] = plan as [bigint, string, string, bigint, bigint, boolean];
        return { id, merchant, name, price, interval, active };
      })()
    : null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100,
    }}>
      <div style={{
        background: "#0f0f1e", border: "0.5px solid #2a2a45",
        borderRadius: 16, padding: 28, maxWidth: 420, width: "90%",
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#e8e8f0", marginBottom: 6 }}>
            Subscribe again
          </div>
          {typedPlan && (
            <div style={{ fontSize: 13, color: "#7070a0" }}>
              <span style={{ color: "#e8e8f0", fontWeight: 500 }}>{typedPlan.name}</span>
              {" — "}{formatUnits(typedPlan.price, 6)} USDC {formatInterval(typedPlan.interval)}
            </div>
          )}
        </div>

        {!typedPlan ? (
          <div style={{ fontSize: 13, color: "#505070", textAlign: "center", padding: "10px" }}>
            Loading plan...
          </div>
        ) : !typedPlan.active ? (
          <div style={{ background: "#080810", border: "0.5px solid #1a1a30", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#a0a0c0" }}>
            This plan is no longer available. The merchant has paused it, so you can&apos;t subscribe again right now.
          </div>
        ) : (
          <SubscribeFlow plan={typedPlan} />
        )}

        <button
          onClick={onClose}
          style={{
            padding: "10px", background: "#1a1a2e",
            color: "#a0a0c0", border: "0.5px solid #2a2a45",
            borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >Close</button>
      </div>
    </div>
  );
}

// ─── Past Due Alert ───────────────────────────────────────────────────────────

function PastDueAlert({ subs }: { subs: Subscription[] }) {
  const { data: gracePeriod } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "GRACE_PERIOD",
    chainId: arcTestnet.id,
  });

  const pastDueSubs = subs.filter(s => s.active && s.pastDue);
  if (pastDueSubs.length === 0 || !gracePeriod) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {pastDueSubs.map((sub) => {
        const deadline = sub.graceStartedAt + (gracePeriod as bigint);
        return (
          <div key={sub.id.toString()} style={{ background: "#2a1a10", border: "0.5px solid #e8956d", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#e8956d" }}>
                  Payment issue on subscription #{sub.id.toString()}
                </div>
                <div style={{ fontSize: 11, color: "#a06040", marginTop: 2 }}>
                  We couldn&apos;t process your last payment. You&apos;ll keep access until {formatDate(deadline)} — make sure you have enough USDC before then.
                </div>
              </div>
            </div>
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#e8956d", background: "#3a2010", border: "0.5px solid #e8956d", borderRadius: 6, padding: "5px 10px", textDecoration: "none", fontWeight: 500, whiteSpace: "nowrap" }}>Get USDC</a>
          </div>
        );
      })}
    </div>
  );
}

// ─── Low Balance Alert ────────────────────────────────────────────────────────

function LowBalanceAlert({ subs }: { subs: Subscription[] }) {
  const { address } = useAccount();

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address!],
    chainId: arcTestnet.id,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const activeSubs = subs.filter(s => s.active && !s.pastDue);
  if (!balance || activeSubs.length === 0) return null;

  const alerts = activeSubs.filter(sub => {
    const daysLeft = Math.max(0, Math.floor((Number(sub.nextChargeAt) - Date.now() / 1000) / 86400));
    return daysLeft <= 3;
  });

  if (alerts.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {alerts.map((sub) => {
        const daysLeft = Math.max(0, Math.floor((Number(sub.nextChargeAt) - Date.now() / 1000) / 86400));
        return (
          <div key={sub.id.toString()} style={{ background: "#2a1a10", border: "0.5px solid #e8956d", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#e8956d" }}>
                  Subscription #{sub.id.toString()} charges {daysLeft === 0 ? "today" : "in " + daysLeft + (daysLeft === 1 ? " day" : " days")}
                </div>
                <div style={{ fontSize: 11, color: "#a06040", marginTop: 2 }}>
                  Make sure you have enough USDC in your wallet
                </div>
              </div>
            </div>
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#e8956d", background: "#3a2010", border: "0.5px solid #e8956d", borderRadius: 6, padding: "5px 10px", textDecoration: "none", fontWeight: 500, whiteSpace: "nowrap" }}>Get USDC</a>
          </div>
        );
      })}
    </div>
  );
}

// ─── Payment History ──────────────────────────────────────────────────────────

function PaymentHistory({ subs }: { subs: Subscription[] }) {
  const [expanded, setExpanded] = useState(false);

  const payments = subs.filter(s => s.totalPaid > BigInt(0));
  if (payments.length === 0) return null;

  const totalPaid = subs.reduce((acc, s) => acc + s.totalPaid, BigInt(0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0f0f1e", border: "0.5px solid #1a1a30", borderRadius: 10, padding: "12px 16px", cursor: "pointer", width: "100%" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0" }}>Payment history</span>
          <span style={{ fontSize: 10, background: "#1a2550", color: "#7eb3f5", padding: "2px 8px", borderRadius: 10 }}>
            {payments.length} {payments.length === 1 ? "payment" : "payments"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#40c057" }}>{formatUnits(totalPaid, 6)} USDC total</span>
          <span style={{ fontSize: 11, color: "#505070" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {payments.map((sub) => (
            <div key={sub.id.toString()} style={{ background: "#0f0f1e", border: "0.5px solid #1a1a30", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0" }}>
                  Subscription #{sub.id.toString()}
                </div>
                <div style={{ fontSize: 11, color: "#505070" }}>
                  <PlanName planId={sub.planId.toString()} /> · Since {formatDate(sub.startedAt)}
                </div>
                <a href={"https://testnet.arcscan.app/address/" + SUBSCRIPTION_MANAGER} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#3b5bdb", textDecoration: "none" }}>View on ArcScan ↗</a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#40c057" }}>{formatUnits(sub.totalPaid, 6)} USDC</div>
                  <div style={{ fontSize: 10, color: "#505070" }}>total paid</div>
                </div>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: sub.active ? "#0d2b1a" : "#1a1a2e", color: sub.active ? "#40c057" : "#505070" }}>
                  {sub.active ? "Active" : "Cancelled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── My Subscriptions ─────────────────────────────────────────────────────────

// ─── Subscription History ─────────────────────────────────────────────────────

type HistoryEntry = {
  blockNumber: bigint;
  logIndex: number;
  timestamp: bigint | null;
  label: string;
  detail?: string;
  icon: string;
  eventName: string;
  transactionHash: string;
};

// Minimal shape we rely on from viem's decoded event logs.
type DecodedLog = {
  eventName: string;
  args: Record<string, unknown>;
  blockNumber: bigint;
  logIndex: number;
  transactionHash: string;
};

const HISTORY_EVENT_NAMES = [
  "Subscribed",
  "Charged",
  "Cancelled",
  "PastDueMarked",
  "Suspended",
  "Reactivated",
] as const;

function describeHistoryEvent(eventName: string, args: Record<string, unknown>): { label: string; detail?: string; icon: string } {
  switch (eventName) {
    case "Subscribed":
      return { label: "Subscribed", icon: "✓" };
    case "Charged": {
      const amount = args.amount as bigint | undefined;
      return {
        label: "Payment processed",
        detail: amount !== undefined ? formatUnits(amount, 6) + " USDC" : undefined,
        icon: "$",
      };
    }
    case "Cancelled":
      return { label: "Subscription cancelled", icon: "×" };
    case "PastDueMarked":
      return { label: "Payment failed — grace period started", icon: "⚠" };
    case "Suspended":
      return { label: "Subscription cancelled (payment failed)", icon: "⛔" };
    case "Reactivated":
      return { label: "Payment recovered — subscription reactivated", icon: "↻" };
    default:
      return { label: eventName, icon: "•" };
  }
}

// Max block range per getLogs call. Public RPCs commonly reject requests
// covering very large ranges, so we fetch in chunks and combine results.
const LOG_CHUNK_SIZE = BigInt(2000);

// How many chunk requests to run in parallel. Keeps things fast without
// overwhelming the RPC provider with too many concurrent requests.
const LOG_FETCH_CONCURRENCY = 4;

function SubscriptionHistory({ subId }: { subId: bigint }) {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient({ chainId: arcTestnet.id });

  useEffect(() => {
    if (!expanded || entries !== null || !publicClient) return;

    let cancelled = false;

    (async () => {
      try {
        const eventAbis = SUBSCRIPTION_MANAGER_ABI.filter(
          (item) => item.type === "event" && (HISTORY_EVENT_NAMES as readonly string[]).includes(item.name)
        );

        const latestBlock = await publicClient.getBlockNumber();

        // Build the list of [from, to] block ranges to fetch.
        const ranges: { from: bigint; to: bigint }[] = [];
        for (let from = DEPLOY_BLOCK; from <= latestBlock; from += LOG_CHUNK_SIZE) {
          const to = from + LOG_CHUNK_SIZE - BigInt(1) > latestBlock ? latestBlock : from + LOG_CHUNK_SIZE - BigInt(1);
          ranges.push({ from, to });
        }

        const fetchRange = async (range: { from: bigint; to: bigint }): Promise<DecodedLog[]> => {
          const rawLogs = await publicClient.getLogs({
            address: SUBSCRIPTION_MANAGER,
            fromBlock: range.from,
            toBlock: range.to,
          });

          const decoded = parseEventLogs({
            abi: eventAbis as never,
            logs: rawLogs,
          }) as unknown as DecodedLog[];

          return decoded.filter((log) => (log.args as { subId?: bigint }).subId === subId);
        };

        const allLogs: DecodedLog[] = [];
        for (let i = 0; i < ranges.length; i += LOG_FETCH_CONCURRENCY) {
          const batch = ranges.slice(i, i + LOG_FETCH_CONCURRENCY);
          const results = await Promise.all(batch.map(fetchRange));
          for (const logs of results) allLogs.push(...logs);
        }

        // Resolve timestamps for each unique block, in parallel.
  
        const uniqueBlocks = Array.from(new Set(allLogs.map((log) => log.blockNumber)));
        const blocks = await Promise.all(
          uniqueBlocks.map((bn) => publicClient.getBlock({ blockNumber: bn }))
        );
        const timestampByBlock = new Map<bigint, bigint>();
        uniqueBlocks.forEach((bn, i) => {
          timestampByBlock.set(bn, blocks[i].timestamp);
        });

        const built: HistoryEntry[] = allLogs.map((log) => {
          const { label, detail, icon } = describeHistoryEvent(log.eventName, log.args ?? {});
          return {
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
            timestamp: timestampByBlock.get(log.blockNumber) ?? null,
            label,
            detail,
            icon,
            eventName: log.eventName,
            transactionHash: log.transactionHash,
          };
        });

        built.sort((a, b) => {
          if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
          return a.logIndex - b.logIndex;
        });

        if (!cancelled) setEntries(built);
      } catch {
        if (!cancelled) setError("Couldn't load history right now.");
      }
    })();

    return () => { cancelled = true; };
  }, [expanded, entries, publicClient, subId]);


            
       

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          fontSize: 11, color: "#7eb3f5",
          background: "none", border: "none",
          cursor: "pointer", padding: 0,
        }}
      >
        {expanded ? "Hide history ▲" : "View history ▼"}
      </button>

      {expanded && (
        <div style={{ marginTop: 10, background: "#080810", border: "0.5px solid #1a1a30", borderRadius: 8, padding: "12px 14px" }}>
          {error && (
            <div style={{ fontSize: 12, color: "#e06060" }}>{error}</div>
          )}
          {!error && entries === null && (
            <div style={{ fontSize: 12, color: "#505070" }}>Loading history... this may take a few seconds.</div>
          )}
          {!error && entries !== null && entries.length === 0 && (
            <div style={{ fontSize: 12, color: "#505070" }}>No events found.</div>
          )}
          {!error && entries !== null && entries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {entries.map((entry, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 600, flexShrink: 0,
                    background: "#1a1a2e", color: "#7eb3f5",
                    border: "0.5px solid #2a2a45",
                  }}>
                    {entry.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#e8e8f0" }}>
                      {entry.label}{entry.detail ? " — " + entry.detail : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "#505070", marginTop: 1 }}>
                      {entry.timestamp !== null ? formatDateTime(entry.timestamp) : "Block #" + entry.blockNumber.toString()}
                      {entry.eventName === "Charged" && (
                        <>
                          {" · "}
                          <a href={"/receipt/" + entry.transactionHash} target="_blank" rel="noopener noreferrer" style={{ color: "#7eb3f5", textDecoration: "none" }}>
                            Share receipt →
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── My Subscriptions ─────────────────────────────────────────────────────────

function MySubscriptions() {


const [cancelModal, setCancelModal] = useState<{
  subId: bigint;
  nextChargeAt: bigint;
  planId: string;
} | null>(null);

const [resubscribeModal, setResubscribeModal] = useState<{
  planId: string;
} | null>(null);



  const { address } = useAccount();

  const { data: subs, isLoading } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "getSubscriberSubs",
    args: [address!],
    chainId: arcTestnet.id,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const { writeContract: cancel, data: cancelHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: cancelHash });

  if (isLoading) return <p style={{ fontSize: 13, color: "#505070" }}>Loading...</p>;
  if (!subs || subs.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#505070", textAlign: "center", padding: "24px", background: "#0f0f1e", borderRadius: 12, border: "0.5px solid #1a1a30" }}>
        No active subscriptions yet.
      </p>
    );
  }

  const typedSubs = subs as Subscription[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PastDueAlert subs={typedSubs} />
      <LowBalanceAlert subs={typedSubs} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {typedSubs.map((sub) => (
          <div key={sub.id.toString()} style={{ background: "#0f0f1e", border: "0.5px solid #1a1a30", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0" }}>
                <PlanName planId={sub.planId.toString()} />
              </div>
              <div style={{ fontSize: 11, color: "#505070" }}>
                Started {formatDate(sub.startedAt)} · Next charge {formatDate(sub.nextChargeAt)} ({daysUntil(sub.nextChargeAt)})
              </div>
              <div style={{ fontSize: 11, color: "#40c057" }}>
                Total paid: {formatUnits(sub.totalPaid, 6)} USDC
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {(() => {
                if (sub.active && sub.pastDue) {
                  return (
                    <span style={{ fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 10, background: "#3a2010", color: "#e8956d" }}>
                      Payment issue
                    </span>
                  );
                }
                if (!sub.active && sub.suspended) {
                  return (
                    <span style={{ fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 10, background: "#2a1010", color: "#e06060" }}>
                      Cancelled (payment failed)
                    </span>
                  );
                }
                return (
                  <span style={{ fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 10, background: sub.active ? "#0d2b1a" : "#1a1a2e", color: sub.active ? "#40c057" : "#505070" }}>
                    {sub.active ? "Active" : "Cancelled"}
                  </span>
                );
              })()}
              {sub.active && (
                <button
                  onClick={() => setCancelModal({
  subId: sub.id,
  nextChargeAt: sub.nextChargeAt,
  planId: sub.planId.toString(),
})}
                  style={{
                    fontSize: 11, color: "#e06060",
                    background: "none", border: "none",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
              {!sub.active && sub.suspended && (
                <button
                  onClick={() => setResubscribeModal({ planId: sub.planId.toString() })}
                  style={{
                    fontSize: 11, color: "#7eb3f5",
                    background: "none", border: "none",
                    cursor: "pointer",
                  }}
                >
                  Subscribe again
                </button>
              )}
            </div>
          </div>
            <SubscriptionHistory subId={sub.id} />
          </div>
        ))}
              
                  


{cancelModal && (
        <CancelModal
          subId={cancelModal.subId}
          nextChargeAt={cancelModal.nextChargeAt}
          planName={<PlanName planId={cancelModal.planId} />}
          onClose={() => setCancelModal(null)}
          onSuccess={() => setCancelModal(null)}
        />
      )}

{resubscribeModal && (
        <ResubscribeModal
          planId={resubscribeModal.planId}
          onClose={() => setResubscribeModal(null)}
        />
      )}


      </div>

      <PaymentHistory subs={typedSubs} />
    </div>
  );
}

// ─── Subscriber View ──────────────────────────────────────────────────────────

export function SubscriberView() {
  const { data: nextPlanId } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "nextPlanId",
    chainId: arcTestnet.id,
    query: { refetchInterval: 10000 },
  });

  const planIds = nextPlanId
    ? Array.from({ length: Number(nextPlanId) }, (_, i) => BigInt(i))
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <div style={{ fontSize: 12, color: "#505070", fontWeight: 500, marginBottom: 14 }}>Available plans</div>
        {planIds.length === 0 ? (
          <p style={{ fontSize: 13, color: "#505070", textAlign: "center", padding: "24px", background: "#0f0f1e", borderRadius: 12, border: "0.5px solid #1a1a30" }}>
            No plans available yet.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {planIds.map((id) => <PlanLoader key={id.toString()} planId={id} />)}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, color: "#505070", fontWeight: 500, marginBottom: 14 }}>My subscriptions</div>
        <MySubscriptions />
      </div>
    </div>
  );
}
