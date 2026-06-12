"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits, parseEventLogs } from "viem";
import { SUBSCRIPTION_MANAGER, arcTestnet } from "@/lib/wagmi";
import { SUBSCRIPTION_MANAGER_ABI } from "@/lib/abi";
import { ConnectButton } from "@/components/ConnectButton";

function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

const EXPLORER_TX_URL = "https://testnet.arcscan.app/tx/";

// ─── Share Button ─────────────────────────────────────────────────────────────
// (mirrors the one on the merchant profile page)

function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        fontSize: 11, fontWeight: 500,
        color: copied ? "#40c057" : "#7070a0",
        background: copied ? "#0d2b1a" : "#1a1a2e",
        border: copied ? "0.5px solid #40c057" : "0.5px solid #2a2a45",
        borderRadius: 6, padding: "4px 12px",
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      {copied ? "✓ Link copied!" : "Copy link ↗"}
    </button>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ReceiptData = {
  amount: bigint;
  planName: string;
  merchant: string;
  subscriber: string;
  timestamp: bigint;
};

// ─── Not Found ────────────────────────────────────────────────────────────────

function ReceiptNotFound({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
        <polygon points="16,1 30,8.5 30,23.5 16,31 2,23.5 2,8.5" fill="#1a1a2e" stroke="#2a2a45" strokeWidth="0.5"/>
        <polygon points="16,8 23,12 23,20 16,24 9,20 9,12" fill="#080810"/>
        <circle cx="16" cy="16" r="3.5" fill="#303050"/>
      </svg>
      <div>
        <div style={{ fontSize: 18, fontWeight: 500, color: "#e8e8f0", marginBottom: 8 }}>
          Receipt not found
        </div>
        <div style={{ fontSize: 13, color: "#505070" }}>
          {message}
        </div>
      </div>
      <a href="/" style={{ fontSize: 13, fontWeight: 500, color: "#7eb3f5", background: "#1a2550", border: "0.5px solid #3b5bdb", borderRadius: 8, padding: "9px 20px", textDecoration: "none" }}>Go to ArcSubs →</a>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReceiptPage() {
  const params = useParams();
  const txHash = params.txHash as string;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const publicClient = usePublicClient({ chainId: arcTestnet.id });

  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted || !publicClient || !txHash) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotFoundMessage(null);
      setReceipt(null);

      try {
        const txReceipt = await publicClient.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        });

        const chargedAbi = SUBSCRIPTION_MANAGER_ABI.filter(
          (item) => item.type === "event" && item.name === "Charged"
        );

        const decoded = parseEventLogs({
          abi: chargedAbi as never,
          logs: txReceipt.logs,
        }) as unknown as { eventName: string; args: { subId: bigint; amount: bigint } }[];

        const chargedEvent = decoded.find((log) => log.eventName === "Charged");

        if (!chargedEvent) {
          if (!cancelled) setNotFoundMessage("This transaction isn't a payment receipt.");
          return;
        }

        const { subId, amount } = chargedEvent.args;

        const sub = await publicClient.readContract({
          address: SUBSCRIPTION_MANAGER,
          abi: SUBSCRIPTION_MANAGER_ABI,
          functionName: "subscriptions",
          args: [subId],
        });

        const [, planId, subscriber] = sub as readonly [bigint, bigint, string, ...unknown[]];

        const plan = await publicClient.readContract({
          address: SUBSCRIPTION_MANAGER,
          abi: SUBSCRIPTION_MANAGER_ABI,
          functionName: "plans",
          args: [planId],
        });

        const [, planMerchant, planName] = plan as readonly [bigint, string, string, ...unknown[]];

        const block = await publicClient.getBlock({ blockNumber: txReceipt.blockNumber });

        if (!cancelled) {
          setReceipt({
            amount,
            planName,
            merchant: planMerchant,
            subscriber,
            timestamp: block.timestamp,
          });
        }
      } catch {
        if (!cancelled) setNotFoundMessage("We couldn't find a transaction with this hash.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [mounted, publicClient, txHash]);

  return (
    <main style={{ minHeight: "100vh", background: "#080810" }}>
      <nav style={{ background: "#0c0c18", borderBottom: "0.5px solid #1a1a30", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <polygon points="16,1 30,8.5 30,23.5 16,31 2,23.5 2,8.5" fill="#3b5bdb" stroke="#5b7bfb" strokeWidth="0.5"/>
            <polygon points="16,8 23,12 23,20 16,24 9,20 9,12" fill="#1a2550"/>
            <circle cx="16" cy="16" r="3.5" fill="#7eb3f5"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#e8e8f0" }}>ArcSubs</span>
          <span style={{ fontSize: 10, background: "#1a2550", color: "#7eb3f5", padding: "2px 8px", borderRadius: 10 }}>Testnet</span>
        </a>
        <ConnectButton />
      </nav>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 24px" }}>
        {!mounted || loading ? (
          <div style={{ textAlign: "center", color: "#505070", fontSize: 13, padding: "32px" }}>Loading receipt...</div>
        ) : notFoundMessage ? (
          <ReceiptNotFound message={notFoundMessage} />
        ) : receipt ? (
          <div style={{ background: "#0f0f1e", border: "0.5px solid #1a1a30", borderRadius: 12, padding: 28, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "#0d2b1a", border: "0.5px solid #40c057",
                fontSize: 22, color: "#40c057",
              }}>
                ✓
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#505070", marginBottom: 4 }}>Payment receipt</div>
                <div style={{ fontSize: 28, fontWeight: 500, color: "#e8e8f0" }}>{formatUnits(receipt.amount, 6)} USDC</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "0.5px solid #1a1a30", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#505070" }}>Plan</span>
                <span style={{ color: "#e8e8f0", fontWeight: 500 }}>{receipt.planName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#505070" }}>Date</span>
                <span style={{ color: "#e8e8f0" }}>{formatDate(receipt.timestamp)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#505070" }}>Paid by</span>
                <span style={{ color: "#e8e8f0", fontFamily: "monospace" }}>{shortAddr(receipt.subscriber)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#505070" }}>Merchant</span>
                <span style={{ color: "#e8e8f0", fontFamily: "monospace" }}>{shortAddr(receipt.merchant)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#505070" }}>Transaction</span>
                
                  <a href={EXPLORER_TX_URL + txHash} target="_blank" rel="noopener noreferrer" style={{ color: "#7eb3f5", fontFamily: "monospace", textDecoration: "none" }}>
{shortAddr (txHash)}
</a>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <a href="/" style={{ fontSize: 11, fontWeight: 500, color: "#7eb3f5", background: "#1a2550", border: "0.5px solid #3b5bdb", borderRadius: 6, padding: "4px 12px", textDecoration: "none" }}>
                ← Back to ArcSubs
              </a>
              <ShareButton />
            </div>
          </div>
        ) : (
          <ReceiptNotFound message="We couldn't find a transaction with this hash." />
        )}
      </div>
    </main>
  );
}
