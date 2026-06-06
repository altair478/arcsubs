"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useState, useEffect } from "react";
import { SUBSCRIPTION_MANAGER, arcTestnet } from "@/lib/wagmi";
import { SUBSCRIPTION_MANAGER_ABI } from "@/lib/abi";
import { formatUnits } from "viem";
import { PlanSubscribers } from "./PlanSubscribers";

function formatInterval(seconds: bigint): string {
  const s = Number(seconds);
  if (s >= 60 * 60 * 24 * 365) return "/ year";
  if (s >= 60 * 60 * 24 * 30) return "/ month";
  if (s >= 60 * 60 * 24 * 7) return "/ week";
  if (s >= 60 * 60 * 24) return "/ day";
  return "/ " + s + "s";
}

type Plan = {
  id: bigint;
  merchant: string;
  name: string;
  price: bigint;
  interval: bigint;
  active: boolean;
};

function PlanCard({ plan, nextSubId }: { plan: Plan; nextSubId: string }) {
  const [mounted, setMounted] = useState(false);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  useEffect(() => { setMounted(true); }, []);

  const toggle = () => {
    writeContract({
      address: SUBSCRIPTION_MANAGER,
      abi: SUBSCRIPTION_MANAGER_ABI,
      functionName: plan.active ? "pausePlan" : "resumePlan",
      args: [plan.id],
    });
  };

  return (
    <div style={{
      background: "#0f0f1e",
      border: plan.active ? "0.5px solid #2a3a70" : "0.5px solid #1a1a30",
      borderRadius: 12, padding: 18,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#e8e8f0", marginBottom: 3 }}>{plan.name}</div>
          <div style={{ fontSize: 11, color: "#505070" }}>Plan #{plan.id.toString()}</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 500, padding: "3px 9px", borderRadius: 10,
          background: plan.active ? "#0d2b1a" : "#1a1a2e",
          color: plan.active ? "#40c057" : "#505070",
        }}>
          {plan.active ? "Active" : "Paused"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: "#080810", borderRadius: 8, padding: "10px 12px", border: "0.5px solid #1a1a30" }}>
          <div style={{ fontSize: 10, color: "#505070", marginBottom: 4 }}>Price</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#e8e8f0" }}>{formatUnits(plan.price, 6)} USDC</div>
        </div>
        <div style={{ background: "#080810", borderRadius: 8, padding: "10px 12px", border: "0.5px solid #1a1a30" }}>
          <div style={{ fontSize: 10, color: "#505070", marginBottom: 4 }}>Interval</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#e8e8f0" }}>{formatInterval(plan.interval)}</div>
        </div>
      </div>

      {mounted && <PlanSubscribers planId={plan.id.toString()} nextSubId={nextSubId} />}

      <div style={{ display: "flex", gap: 8 }}>
        <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: "center", fontSize: 12, color: "#7070a0", background: "#080810", border: "0.5px solid #1a1a30", borderRadius: 8, padding: "8px", textDecoration: "none" }}>ArcScan ↗</a>
        <button
          onClick={toggle}
          disabled={isPending || isConfirming}
          style={{
            flex: 1, fontSize: 12, fontWeight: 500, padding: "8px", borderRadius: 8, border: "none",
            cursor: isPending || isConfirming ? "not-allowed" : "pointer",
            opacity: isPending || isConfirming ? 0.5 : 1,
            background: plan.active ? "#2a1a10" : "#0d2b1a",
            color: plan.active ? "#e8956d" : "#40c057",
          }}
        >
          {isPending || isConfirming ? "Confirming..." : plan.active ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  );
}

export function MerchantPlans({ refresh }: { refresh: number }) {
  const [mounted, setMounted] = useState(false);
  const { address } = useAccount();

  useEffect(() => { setMounted(true); }, []);

  const { data: plans, isLoading } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "getMerchantPlans",
    args: [address!],
    chainId: arcTestnet.id,
    query: { enabled: !!address && mounted, refetchInterval: 5000 },
  });

  const { data: nextSubId } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "nextSubId",
    chainId: arcTestnet.id,
    query: { enabled: mounted, refetchInterval: 10000 },
  });

  if (!mounted) return null;

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: "32px", color: "#505070", fontSize: 13 }}>Loading plans...</div>;
  }

  if (!plans || plans.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px", background: "#0f0f1e", borderRadius: 12, border: "0.5px solid #1a1a30", color: "#505070", fontSize: 13 }}>
        No plans yet. Create your first plan below.
      </div>
    );
  }

  const activePlans = plans.filter((p) => p.active);
  const mrr = activePlans.reduce((acc, p) => {
    const priceUsd = parseFloat(formatUnits(p.price, 6));
    const intervalDays = Number(p.interval) / (60 * 60 * 24);
    return acc + (priceUsd / intervalDays) * 30;
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: "Estimated MRR", value: "$" + mrr.toFixed(2), sub: "USDC / month" },
          { label: "Active plans", value: activePlans.length.toString(), sub: plans.length + " total" },
          { label: "Paused plans", value: (plans.length - activePlans.length).toString(), sub: "inactive" },
        ].map((m) => (
          <div key={m.label} style={{ background: "#0f0f1e", border: "0.5px solid #1a1a30", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#505070", marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: "#e8e8f0" }}>{m.value}</div>
            <div style={{ fontSize: 11, color: "#3b5bdb", marginTop: 3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {plans.map((plan) => (
          <PlanCard key={plan.id.toString()} plan={plan} nextSubId={(nextSubId ?? BigInt(0)).toString()} />
        ))}
      </div>
    </div>
  );
}
