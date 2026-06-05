"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { SUBSCRIPTION_MANAGER } from "@/lib/wagmi";
import { SUBSCRIPTION_MANAGER_ABI } from "@/lib/abi";

const INTERVALS = [
  { label: "Daily",   value: 60 * 60 * 24 },
  { label: "Weekly",  value: 60 * 60 * 24 * 7 },
  { label: "Monthly", value: 60 * 60 * 24 * 30 },
  { label: "Yearly",  value: 60 * 60 * 24 * 365 },
];

export function CreatePlanForm({ onSuccess }: { onSuccess: () => void }) {
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState(INTERVALS[2].value);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      setName("");
      setPrice("");
      setInterval(INTERVALS[2].value);
      reset();
      onSuccess();
    }
  }, [isSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    writeContract({
      address: SUBSCRIPTION_MANAGER,
      abi: SUBSCRIPTION_MANAGER_ABI,
      functionName: "createPlan",
      args: [name, parseUnits(price, 6), BigInt(interval)],
    });
  };

  return (
    <div style={{
      background: "#0f0f1e",
      border: "0.5px solid #1a1a30",
      borderRadius: 12, padding: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#a0a0c0", marginBottom: 16 }}>
        Create new plan
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Name */}
        <div>
          <div style={{ fontSize: 11, color: "#505070", marginBottom: 6 }}>Plan name</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pro Plan"
            required
            style={{
              width: "100%",
              background: "#080810",
              border: "0.5px solid #1a1a30",
              borderRadius: 8, padding: "9px 12px",
              fontSize: 13, color: "#e8e8f0",
              outline: "none",
            }}
          />
        </div>

        {/* Price */}
        <div>
          <div style={{ fontSize: 11, color: "#505070", marginBottom: 6 }}>Price (USDC)</div>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="any"
              required
              style={{
                width: "100%",
                background: "#080810",
                border: "0.5px solid #1a1a30",
                borderRadius: 8, padding: "9px 48px 9px 12px",
                fontSize: 13, color: "#e8e8f0",
                outline: "none",
              }}
            />
            <span style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11, color: "#505070",
            }}>
              USDC
            </span>
          </div>
        </div>

        {/* Interval */}
        <div>
          <div style={{ fontSize: 11, color: "#505070", marginBottom: 6 }}>Billing interval</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {INTERVALS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setInterval(opt.value)}
                style={{
                  padding: "8px 0",
                  borderRadius: 8, fontSize: 12,
                  fontWeight: interval === opt.value ? 500 : 400,
                  border: interval === opt.value ? "0.5px solid #3b5bdb" : "0.5px solid #1a1a30",
                  background: interval === opt.value ? "#1a2550" : "#080810",
                  color: interval === opt.value ? "#7eb3f5" : "#505070",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 11, color: "#e06060",
            background: "#2a1010",
            border: "0.5px solid #5a2020",
            borderRadius: 8, padding: "8px 12px",
          }}>
            {error.message.slice(0, 120)}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!isConnected || isPending || isConfirming}
          style={{
            width: "100%", padding: "10px",
            background: "#3b5bdb", color: "#fff",
            border: "none", borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            cursor: !isConnected || isPending || isConfirming ? "not-allowed" : "pointer",
            opacity: !isConnected || isPending || isConfirming ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {isPending ? "Confirm in wallet..." : isConfirming ? "Confirming on Arc..." : "Create plan"}
        </button>

        <div style={{ textAlign: "center", fontSize: 11, color: "#303050" }}>
          Gas paid in USDC · Arc Testnet
        </div>
      </form>
    </div>
  );
}
