"use client";

import { useParams } from "next/navigation";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { SUBSCRIPTION_MANAGER, arcTestnet, USDC_ADDRESS } from "@/lib/wagmi";
import { SUBSCRIPTION_MANAGER_ABI, USDC_ABI } from "@/lib/abi";
import { formatUnits, maxUint256 } from "viem";
import { ConnectButton } from "@/components/ConnectButton";

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

function SubscribeFlow({ plan }: { plan: Plan }) {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [address!, SUBSCRIPTION_MANAGER],
    chainId: arcTestnet.id,
    query: { enabled: !!address && mounted, refetchInterval: 3000 },
  });

  const needsApproval = !allowance || allowance < plan.price;
  const { writeContract: approve, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { writeContract: subscribe, data: subHash, isPending: isSubPending } = useWriteContract();
  const { isLoading: isSubConfirming, isSuccess: isSubSuccess } = useWaitForTransactionReceipt({ hash: subHash });

  if (!mounted) return null;

  if (!address) {
    return <div style={{ fontSize: 12, color: "#505070", textAlign: "center", padding: "8px" }}>Connect wallet to subscribe</div>;
  }

  if (isSubSuccess) {
    return <div style={{ fontSize: 13, color: "#40c057", textAlign: "center", fontWeight: 500 }}>✓ Subscribed successfully</div>;
  }

  const approved = isApproveSuccess || !needsApproval;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div style={{ background: "#0f0f1e", border: "0.5px solid #2a3a70", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#e8e8f0" }}>{plan.name}</div>
        <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 10, background: "#0d2b1a", color: "#40c057", fontWeight: 500 }}>Active</span>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 500, color: "#e8e8f0" }}>{formatUnits(plan.price, 6)} USDC</div>
        <div style={{ fontSize: 12, color: "#505070" }}>{formatInterval(plan.interval)}</div>
      </div>
      <SubscribeFlow plan={plan} />
    </div>
  );
}

function EditProfileForm({ merchantAddress }: { merchantAddress: string }) {
  const { address } = useAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [open, setOpen] = useState(false);

  const isOwner = address?.toLowerCase() === merchantAddress.toLowerCase();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) setOpen(false);
  }, [isSuccess]);

  if (!isOwner) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{ fontSize: 11, color: "#7eb3f5", background: "#1a2550", border: "0.5px solid #3b5bdb", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}
      >
        {open ? "Cancel" : "Edit profile"}
      </button>

      {open && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#505070", marginBottom: 4 }}>Display name</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Señales VIP by Juan"
              style={{ width: "100%", background: "#080810", border: "0.5px solid #1a1a30", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#e8e8f0", outline: "none" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#505070", marginBottom: 4 }}>Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell subscribers what you offer..."
              rows={3}
              style={{ width: "100%", background: "#080810", border: "0.5px solid #1a1a30", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#e8e8f0", outline: "none", resize: "none" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#505070", marginBottom: 4 }}>Avatar URL (optional)</div>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              style={{ width: "100%", background: "#080810", border: "0.5px solid #1a1a30", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#e8e8f0", outline: "none" }}
            />
          </div>
          <button
            onClick={() => writeContract({
              address: SUBSCRIPTION_MANAGER,
              abi: SUBSCRIPTION_MANAGER_ABI,
              functionName: "setProfile",
              args: [name, description, avatarUrl],
            })}
            disabled={!name || isPending || isConfirming}
            style={{ padding: "9px", background: "#3b5bdb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: !name || isPending || isConfirming ? "not-allowed" : "pointer", opacity: !name || isPending || isConfirming ? 0.6 : 1 }}
          >
            {isPending ? "Confirm in wallet..." : isConfirming ? "Saving onchain..." : "Save profile"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MerchantProfile() {
  const params = useParams();
  const merchantAddress = params.address as string;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: plans, isLoading } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "getMerchantPlans",
    args: [merchantAddress as `0x${string}`],
    chainId: arcTestnet.id,
    query: { enabled: mounted && !!merchantAddress },
  });

  const { data: profile } = useReadContract({
    address: SUBSCRIPTION_MANAGER,
    abi: SUBSCRIPTION_MANAGER_ABI,
    functionName: "getProfile",
    args: [merchantAddress as `0x${string}`],
    chainId: arcTestnet.id,
    query: { enabled: mounted && !!merchantAddress, refetchInterval: 5000 },
  });

  const activePlans = plans ? (plans as Plan[]).filter((p) => p.active) : [];
  const profileName = profile ? (profile as [string, string, string])[0] : "";
  const profileDesc = profile ? (profile as [string, string, string])[1] : "";
  const profileAvatar = profile ? (profile as [string, string, string])[2] : "";

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

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
        {/* Merchant header */}
        <div style={{ background: "#0f0f1e", border: "0.5px solid #1a1a30", borderRadius: 12, padding: "24px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {profileAvatar ? (
              <img src={profileAvatar} alt="avatar" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "0.5px solid #3b5bdb" }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#1a2550", border: "0.5px solid #3b5bdb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#7eb3f5", fontWeight: 500 }}>
                {merchantAddress ? merchantAddress.slice(2, 4).toUpperCase() : "??"}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#e8e8f0", marginBottom: 2 }}>
                {profileName || (merchantAddress ? merchantAddress.slice(0, 6) + "..." + merchantAddress.slice(-4) : "")}
              </div>
              <div style={{ fontSize: 12, color: "#505070" }}>Merchant on ArcSubs</div>
              <div style={{ fontSize: 12, color: "#3b5bdb", marginTop: 2 }}>
                {activePlans.length} active {activePlans.length === 1 ? "plan" : "plans"}
              </div>
            </div>
          </div>

          {profileDesc && (
            <div style={{ fontSize: 13, color: "#a0a0c0", lineHeight: 1.6, borderTop: "0.5px solid #1a1a30", paddingTop: 12 }}>
              {profileDesc}
            </div>
          )}

          {mounted && <EditProfileForm merchantAddress={merchantAddress} />}
        </div>

        {/* Plans */}
        {!mounted || isLoading ? (
          <div style={{ textAlign: "center", color: "#505070", fontSize: 13, padding: "32px" }}>Loading plans...</div>
        ) : activePlans.length === 0 ? (
          <div style={{ textAlign: "center", color: "#505070", fontSize: 13, padding: "32px", background: "#0f0f1e", borderRadius: 12, border: "0.5px solid #1a1a30" }}>
            This merchant has no active plans.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {activePlans.map((plan: Plan) => (
              <PlanCard key={plan.id.toString()} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
