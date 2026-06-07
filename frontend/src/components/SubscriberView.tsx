"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, maxUint256 } from "viem";
import { SUBSCRIPTION_MANAGER, USDC_ADDRESS, arcTestnet } from "@/lib/wagmi";
import { SUBSCRIPTION_MANAGER_ABI, USDC_ABI } from "@/lib/abi";

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
};

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
      {/* Step indicator */}
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

      {/* Approve button */}
      {!approved && (
        <button
          onClick={() => approve({
            address: USDC_ADDRESS,
            abi: USDC_ABI,
            functionName: "approve",
            args: [SUBSCRIPTION_MANAGER, maxUint256],
          })}
          disabled={isApprovePending || isApproveConfirming}
          style={{
            width: "100%", padding: "9px",
            background: "#2a3a70", color: "#7eb3f5",
            border: "0.5px solid #3b5bdb",
            borderRadius: 8, fontSize: 12, fontWeight: 500,
            cursor: isApprovePending || isApproveConfirming ? "not-allowed" : "pointer",
            opacity: isApprovePending || isApproveConfirming ? 0.6 : 1,
          }}
        >
          {isApprovePending ? "Confirm in wallet..." : isApproveConfirming ? "Approving..." : "Approve USDC"}
        </button>
      )}

      {/* Subscribe button */}
      <button
        onClick={() => subscribe({
          address: SUBSCRIPTION_MANAGER,
          abi: SUBSCRIPTION_MANAGER_ABI,
          functionName: "subscribe",
          args: [plan.id],
        })}
        disabled={!approved || isSubPending || isSubConfirming}
        style={{
          width: "100%", padding: "9px",
          background: approved ? "#3b5bdb" : "#1a1a2e",
          color: approved ? "#fff" : "#505070",
          border: "none", borderRadius: 8,
          fontSize: 12, fontWeight: 500,
          cursor: approved && !isSubPending && !isSubConfirming ? "pointer" : "not-allowed",
          opacity: isSubPending || isSubConfirming ? 0.6 : 1,
          transition: "background 0.15s",
        }}
      >
        {isSubPending ? "Confirm in wallet..." : isSubConfirming ? "Confirming on Arc..." : "Subscribe"}
      </button>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div style={{
      background: "#0f0f1e",
      border: "0.5px solid #1a1a30",
      borderRadius: 12, padding: 18,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#e8e8f0", marginBottom: 3 }}>{plan.name}</div>
          <div style={{ fontSize: 11, color: "#505070" }}>
            {plan.merchant.slice(0, 6)}...{plan.merchant.slice(-4)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: "#e8e8f0" }}>
            {formatUnits(plan.price, 6)} USDC
          </div>
          <div style={{ fontSize: 11, color: "#505070" }}>{formatInterval(plan.interval)}</div>
        </div>
      </div>

      {plan.active ? (
        <SubscribeFlow plan={plan} />
      ) : (
        <div style={{
          textAlign: "center", fontSize: 12,
          color: "#505070", padding: "8px",
          background: "#080810", borderRadius: 8,
        }}>
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

  const { data: nextPlanId } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "nextPlanId",
    chainId: arcTestnet.id,
  });

  const activeSubs = subs.filter(s => s.active);

  if (!balance || activeSubs.length === 0 || !nextPlanId) return null;

  // Find subs where balance < plan price
  const alerts: { subId: string; planId: string; nextChargeAt: bigint }[] = [];

  for (const sub of activeSubs) {
    alerts.push({
      subId: sub.id.toString(),
      planId: sub.planId.toString(),
      nextChargeAt: sub.nextChargeAt,
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {activeSubs.map((sub) => {
        const daysLeft = Math.max(0, Math.floor((Number(sub.nextChargeAt) - Date.now() / 1000) / 86400));
        const isLow = daysLeft <= 3;

        if (!isLow) return null;

        return (
          <div key={sub.id.toString()} style={{
            background: "#2a1a10",
            border: "0.5px solid #e8956d",
            borderRadius: 10, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#e8956d" }}>
                  Subscription #{sub.id.toString()} charges in {daysLeft === 0 ? "less than 1 day" : daysLeft + " days"}
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


function PaymentHistory({ subs }: { subs: Subscription[] }) {
  const [expanded, setExpanded] = useState(false);

  if (subs.length === 0) return null;

  const totalPaid = subs.reduce((acc, s) => acc + s.totalPaid, BigInt(0));

  // Build payment history from subscriptions
  const payments: { subId: string; planId: string; amount: bigint; date: bigint; active: boolean }[] = [];

  for (const sub of subs) {
    if (sub.totalPaid > BigInt(0)) {
      payments.push({
        subId: sub.id.toString(),
        planId: sub.planId.toString(),
        amount: sub.totalPaid,
        date: sub.startedAt,
        active: sub.active,
      });
    }
  }

  if (payments.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#0f0f1e", border: "0.5px solid #1a1a30",
          borderRadius: 10, padding: "12px 16px",
          cursor: "pointer", width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0" }}>Payment history</span>
          <span style={{
            fontSize: 10, background: "#1a2550",
            color: "#7eb3f5", padding: "2px 8px", borderRadius: 10,
          }}>
            {payments.length} {payments.length === 1 ? "payment" : "payments"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#40c057" }}>
            {formatUnits(totalPaid, 6)} USDC total
          </span>
          <span style={{ fontSize: 11, color: "#505070" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {payments.map((payment) => (
            <div key={payment.subId} style={{
              background: "#0f0f1e",
              border: "0.5px solid #1a1a30",
              borderRadius: 8, padding: "12px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0" }}>
                  Subscription #{payment.subId}
                </div>
                <div style={{ fontSize: 11, color: "#505070" }}>
                <PlanName planId={payment.planId} /> · Since {formatDate(payment.date)}
              </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#40c057" }}>
                    {formatUnits(payment.amount, 6)} USDC
                  </div>
                  <div style={{ fontSize: 10, color: "#505070" }}>total paid</div>
                </div>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 10,
                  background: payment.active ? "#0d2b1a" : "#1a1a2e",
                  color: payment.active ? "#40c057" : "#505070",
                }}>
                  {payment.active ? "Active" : "Cancelled"}
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

function MySubscriptions() {
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
      {/* Low balance alerts */}
      <LowBalanceAlert subs={typedSubs} />

      {/* Subscriptions list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {typedSubs.map((sub) => (
          <div key={sub.id.toString()} style={{
            background: "#0f0f1e",
            border: "0.5px solid #1a1a30",
            borderRadius: 10, padding: "14px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0" }}>
                Subscription #{sub.id.toString()} · Plan #{sub.planId.toString()}
              </div>
              <div style={{ fontSize: 11, color: "#505070" }}>
                Started {formatDate(sub.startedAt)} · Next charge {formatDate(sub.nextChargeAt)}
              </div>
              <div style={{ fontSize: 11, color: "#40c057" }}>
                Total paid: {formatUnits(sub.totalPaid, 6)} USDC
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                fontSize: 10, fontWeight: 500,
                padding: "3px 9px", borderRadius: 10,
                background: sub.active ? "#0d2b1a" : "#1a1a2e",
                color: sub.active ? "#40c057" : "#505070",
              }}>
                {sub.active ? "Active" : "Cancelled"}
              </span>
              {sub.active && (
                <button
                  onClick={() => cancel({
                    address: SUBSCRIPTION_MANAGER,
                    abi: SUBSCRIPTION_MANAGER_ABI,
                    functionName: "cancel",
                    args: [sub.id],
                  })}
                  disabled={isPending || isConfirming}
                  style={{
                    fontSize: 11, color: "#e06060",
                    background: "none", border: "none",
                    cursor: "pointer",
                    opacity: isPending || isConfirming ? 0.5 : 1,
                  }}
                >
                  {isPending || isConfirming ? "Cancelling..." : "Cancel"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Payment history */}
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
      {/* Available Plans */}
      <div>
        <div style={{ fontSize: 12, color: "#505070", fontWeight: 500, marginBottom: 14 }}>
          Available plans
        </div>
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

      {/* My Subscriptions */}
      <div>
        <div style={{ fontSize: 12, color: "#505070", fontWeight: 500, marginBottom: 14 }}>
          My subscriptions
        </div>
        <MySubscriptions />
      </div>
    </div>
  );
}
