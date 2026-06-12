"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SUBSCRIPTION_MANAGER } from "@/lib/wagmi";
import { SUBSCRIPTION_MANAGER_ABI } from "@/lib/abi";

type CancelModalProps = {
  subId: bigint;
  nextChargeAt: bigint;
  planName: React.ReactNode;
  onClose: () => void;
  onSuccess: () => void;
};

function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export function CancelModal({ subId, nextChargeAt, planName, onClose, onSuccess }: CancelModalProps) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      onSuccess();
      onClose();
    }
  }, [isSuccess]);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100,
    }}>
      <div style={{
        background: "#0f0f1e",
        border: "0.5px solid #2a2a45",
        borderRadius: 16, padding: 28,
        maxWidth: 420, width: "90%",
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        {/* Header */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#e8e8f0", marginBottom: 6 }}>
            Cancel subscription
          </div>
          <div style={{ fontSize: 13, color: "#7070a0" }}>
            You are about to cancel your subscription to <span style={{ color: "#e8e8f0", fontWeight: 500 }}>{planName}</span>.
          </div>
        </div>

        {/* Info box */}
        <div style={{
          background: "#080810",
          border: "0.5px solid #1a1a30",
          borderRadius: 10, padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0" }}>
                You will not be charged again
              </div>
              <div style={{ fontSize: 12, color: "#505070", marginTop: 2 }}>
                No future charges will be made to your wallet.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 16 }}>📅</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0" }}>
                Your current period runs until {formatDate(nextChargeAt)}
              </div>
              <div style={{ fontSize: 12, color: "#505070", marginTop: 2 }}>
                You have already paid for this period. No refunds are issued.
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={isPending || isConfirming}
            style={{
              flex: 1, padding: "10px",
              background: "#1a1a2e",
              color: "#a0a0c0",
              border: "0.5px solid #2a2a45",
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Go back
          </button>
          <button
            onClick={() => writeContract({
              address: SUBSCRIPTION_MANAGER,
              abi: SUBSCRIPTION_MANAGER_ABI,
              functionName: "cancel",
              args: [subId],
            })}
            disabled={isPending || isConfirming}
            style={{
              flex: 1, padding: "10px",
              background: "#2a1010",
              color: "#e06060",
              border: "0.5px solid #5a2020",
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: isPending || isConfirming ? "not-allowed" : "pointer",
              opacity: isPending || isConfirming ? 0.6 : 1,
            }}
          >
            {isPending ? "Confirm in wallet..." : isConfirming ? "Cancelling..." : "Confirm cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}
