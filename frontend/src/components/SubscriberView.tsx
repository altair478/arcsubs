"use client";

import { useState } from "react";
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

function SubscribeFlow({ plan }: { plan: Plan }) {
  const { address } = useAccount();
  const [step, setStep] = useState<"idle" | "approving" | "subscribing" | "done">("idle");

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
      <div style={{
        textAlign: "center", padding: "10px",
        color: "#40c057", fontSize: 13, fontWeight: 500,
      }}>
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

  if (isLoading) {
    return <div style={{ fontSize: 13, color: "#505070" }}>Loading...</div>;
  }

  if (!subs || subs.length === 0) {
    return (
      <div style={{
        textAlign: "center", padding: "24px",
        background: "#0f0f1e", borderRadius: 12,
        border: "0.5px solid #1a1a30",
        color: "#505070", fontSize: 13,
      }}>
        No active subscriptions yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {(subs as Subscription[]).map((sub) => (
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
                  cursor: "pointer", opacity: isPending || isConfirming ? 0.5 : 1,
                }}
              >
                {isPending || isConfirming ? "Cancelling..." : "Cancel"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

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
        <div style={{ fontSize: 12, color: "#505070", fontWeight: 500, marginBottom: 14 }}>
          Available plans
        </div>
        {planIds.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "24px",
            background: "#0f0f1e", borderRadius: 12,
            border: "0.5px solid #1a1a30",
            color: "#505070", fontSize: 13,
          }}>
            No plans available yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {planIds.map((id) => <PlanLoader key={id.toString()} planId={id} />)}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, color: "#505070", fontWeight: 500, marginBottom: 14 }}>
          My subscriptions
        </div>
        <MySubscriptions />
      </div>
    </div>
  );
}
