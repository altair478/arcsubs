"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { arcTestnet, SUBSCRIPTION_MANAGER } from "@/lib/wagmi";
import { SUBSCRIPTION_MANAGER_ABI } from "@/lib/abi";

type Subscription = {
  id: string;
  subscriber: string;
  startedAt: bigint;
  nextChargeAt: bigint;
  totalPaid: bigint;
  active: boolean;
};

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function PlanSubscribers({ planId, nextSubId }: { planId: string; nextSubId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const total = BigInt(nextSubId);
    const pid = BigInt(planId);

    if (total === BigInt(0)) {
      setLoading(false);
      return;
    }

    const client = createPublicClient({
      chain: arcTestnet,
      transport: http("https://rpc.testnet.arc.network"),
    });

    const fetchSubs = async () => {
      setLoading(true);
      const results: Subscription[] = [];

      for (let i = BigInt(0); i < total; i++) {
        try {
          const SUBS_ABI = [{ name: "subscriptions", type: "function", stateMutability: "view", inputs: [{ name: "subId", type: "uint256" }], outputs: [{ name: "id", type: "uint256" }, { name: "planId", type: "uint256" }, { name: "subscriber", type: "address" }, { name: "startedAt", type: "uint256" }, { name: "nextChargeAt", type: "uint256" }, { name: "totalPaid", type: "uint256" }, { name: "active", type: "bool" }] }] as const;
          const sub = await client.readContract({
            address: SUBSCRIPTION_MANAGER,
            abi: SUBS_ABI,
            functionName: "subscriptions",
            args: [i],
          }) as unknown as [bigint, bigint, string, bigint, bigint, bigint, boolean];

          const [id, subPlanId, subscriber, startedAt, nextChargeAt, totalPaid, active] = sub;
          if (subPlanId === pid) {
            results.push({ id: id.toString(), subscriber, startedAt, nextChargeAt, totalPaid, active });
          }
        } catch (e) {
          console.error("Error fetching sub", i.toString(), e);
        }
      }

      console.log("Plan", planId, "subscribers found:", results.length);
      setSubscribers(results);
      setLoading(false);
    };

    fetchSubs();
  }, [nextSubId, planId]);

  const activeCount = subscribers.filter(s => s.active).length;
  const totalVolume = subscribers.reduce((acc, s) => acc + s.totalPaid, BigInt(0));

  return (
    <div style={{ borderTop: "0.5px solid #1a1a30", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
      {loading ? (
        <div style={{ fontSize: 11, color: "#505070" }}>Loading subscribers...</div>
      ) : (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#080810", border: "0.5px solid #1a1a30",
              borderRadius: 8, padding: "8px 12px", cursor: "pointer", width: "100%",
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 11, color: "#505070" }}>Subscribers </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0" }}>{activeCount}</span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#505070" }}>Volume </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#40c057" }}>{formatUnits(totalVolume, 6)} USDC</span>
              </div>
            </div>
            <span style={{ fontSize: 11, color: "#505070" }}>{expanded ? "▲ Hide" : "▼ Details"}</span>
          </button>

          {expanded && subscribers.length === 0 && (
            <div style={{ fontSize: 11, color: "#505070", textAlign: "center", padding: "10px", background: "#080810", borderRadius: 8 }}>
              No subscribers yet
            </div>
          )}

          {expanded && subscribers.map((sub) => (
            <div key={sub.id} style={{
              background: "#080810", border: "0.5px solid #1a1a30",
              borderRadius: 8, padding: "10px 12px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#1a2550", border: "0.5px solid #3b5bdb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "#7eb3f5", fontWeight: 500,
                  }}>
                    {sub.subscriber.slice(2, 4).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, color: "#e8e8f0", fontFamily: "monospace" }}>{shortAddr(sub.subscriber)}</span>
                  <span style={{
                    fontSize: 10, padding: "2px 6px", borderRadius: 6,
                    background: sub.active ? "#0d2b1a" : "#1a1a2e",
                    color: sub.active ? "#40c057" : "#505070",
                  }}>
                    {sub.active ? "Active" : "Cancelled"}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "#505070", marginLeft: 30 }}>
                  Since {formatDate(sub.startedAt)} · Next {formatDate(sub.nextChargeAt)}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#40c057" }}>{formatUnits(sub.totalPaid, 6)} USDC</div>
                <div style={{ fontSize: 10, color: "#505070" }}>total paid</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
