"use client";

import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { USDC_ADDRESS, arcTestnet } from "@/lib/wagmi";
import { USDC_ABI } from "@/lib/abi";
import { formatUnits } from "viem";
import { useEffect, useState } from "react";

export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address!],
    chainId: arcTestnet.id,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
        style={{
          background: "#3b5bdb",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "9px 20px",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          opacity: isPending ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  const isWrongNetwork = chain?.id !== arcTestnet.id;

  if (isWrongNetwork) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontSize: 12, color: "#ff6b6b",
          background: "#2a1010",
          border: "0.5px solid #5a2020",
          borderRadius: 20, padding: "5px 12px",
        }}>
          Wrong network
        </span>
        <button
          onClick={() => disconnect()}
          style={{
            background: "#1a1a2e", color: "#7070a0",
            border: "0.5px solid #2a2a45",
            borderRadius: 8, padding: "7px 14px",
            fontSize: 12, cursor: "pointer",
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        background: "#0f0f1e",
        border: "0.5px solid #1a1a30",
        borderRadius: 20,
        padding: "6px 14px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 7, height: 7,
          background: "#40c057",
          borderRadius: "50%",
        }} />
        <span style={{ fontSize: 12, color: "#a0a0c0" }}>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#40c057" }}>
          {balance !== undefined
            ? parseFloat(formatUnits(balance, 6)).toFixed(2) + " USDC"
            : "..."}
        </span>
      </div>
      <button
        onClick={() => disconnect()}
        style={{
          background: "#1a1a2e", color: "#7070a0",
          border: "0.5px solid #2a2a45",
          borderRadius: 8, padding: "7px 14px",
          fontSize: 12, cursor: "pointer",
        }}
      >
        Disconnect
      </button>
    </div>
  );
}
