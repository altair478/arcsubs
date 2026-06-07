"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { CreatePlanForm } from "@/components/CreatePlanForm";
import { MerchantPlans } from "@/components/MerchantPlans";
import { SubscriberView } from "@/components/SubscriberView";

type Tab = "subscriber" | "merchant";

const HexLogo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <polygon points="16,1 30,8.5 30,23.5 16,31 2,23.5 2,8.5" fill="#3b5bdb" stroke="#5b7bfb" strokeWidth="0.5"/>
    <polygon points="16,8 23,12 23,20 16,24 9,20 9,12" fill="#1a2550"/>
    <circle cx="16" cy="16" r="3.5" fill="#7eb3f5"/>
  </svg>
);

const useCases = [
  { icon: "[ ]", title: "SaaS & APIs", desc: "Charge for access to your product or API in USDC monthly" },
  { icon: "{ }", title: "DAOs", desc: "Collect membership fees from contributors automatically" },
  { icon: "< >", title: "Creators", desc: "Monetize your work without Patreon or Web2 middlemen" },
];

const steps = [
  { n: "1", title: "Merchant creates a plan", desc: "Set a name, price in USDC, and billing interval" },
  { n: "2", title: "Subscriber approves USDC once", desc: "One-time ERC-20 approval — no signing every month" },
  { n: "3", title: "Keeper bot charges automatically", desc: "Permissionless bot detects due subscriptions and collects payment" },
];

export default function Home() {
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("subscriber");
  const [refresh, setRefresh] = useState(0);

  return (
    <main style={{ minHeight: "100vh", background: "#080810" }}>
      <nav style={{
        background: "#0c0c18",
        borderBottom: "0.5px solid #1a1a30",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <HexLogo />
          <span style={{ fontSize: 15, fontWeight: 500, color: "#e8e8f0" }}>ArcSubs</span>
          <span style={{
            fontSize: 10, background: "#1a2550",
            color: "#7eb3f5", padding: "2px 8px", borderRadius: 10,
          }}>Testnet</span>
        </div>
        <ConnectButton />
      </nav>

      {!isConnected && (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#1a2550", border: "0.5px solid #2a3a70",
              borderRadius: 20, padding: "5px 14px", marginBottom: 24,
            }}>
              <div style={{ width: 6, height: 6, background: "#40c057", borderRadius: "50%" }} />
              <span style={{ fontSize: 12, color: "#7eb3f5" }}>Live on Arc Testnet</span>
            </div>

            <h1 style={{
              fontSize: 42, fontWeight: 500, color: "#e8e8f0",
              lineHeight: 1.2, marginBottom: 16,
            }}>
              Recurring USDC payments,
              <br />
              <span style={{ color: "#3b5bdb" }}>fully onchain.</span>
            </h1>

            <p style={{
              fontSize: 16, color: "#7070a0",
              maxWidth: 440, margin: "0 auto 32px", lineHeight: 1.7,
            }}>
              ArcSubs is an open protocol for subscription payments on Arc.
              Create plans, charge subscribers automatically — no intermediaries.
            </p>

            <ConnectButton />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 48 }}>
            {useCases.map((item) => (
              <div key={item.title} style={{
                background: "#0f0f1e",
                border: "0.5px solid #1a1a30",
                borderRadius: 12, padding: "20px 16px",
              }}>
                <div style={{ fontSize: 22, marginBottom: 10, color: "#3b5bdb" }}>{item.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0", marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "#7070a0", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          <div style={{
            background: "#0f0f1e",
            border: "0.5px solid #1a1a30",
            borderRadius: 12, padding: 24,
          }}>
            <div style={{ fontSize: 12, color: "#505070", marginBottom: 16, fontWeight: 500 }}>How it works</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {steps.map((step) => (
                <div key={step.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{
                    width: 24, height: 24, background: "#1a2550",
                    border: "0.5px solid #3b5bdb", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "#7eb3f5", flexShrink: 0,
                  }}>{step.n}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e8f0", marginBottom: 2 }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: "#7070a0" }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isConnected && (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
          <div style={{
            display: "flex", gap: 4,
            background: "#0f0f1e",
            border: "0.5px solid #1a1a30",
            borderRadius: 10, padding: 4,
            width: "fit-content", marginBottom: 28,
          }}>
            {(["subscriber", "merchant"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "7px 20px", borderRadius: 7,
                  fontSize: 13, fontWeight: tab === t ? 500 : 400,
                  border: "none", cursor: "pointer",
                  background: tab === t ? "#3b5bdb" : "transparent",
                  color: tab === t ? "#fff" : "#7070a0",
                  transition: "all 0.15s",
                  textTransform: "capitalize",
                }}
              >
                {t === "subscriber" ? "Subscribe" : "Merchant"}
              </button>
            ))}
          </div>

          {tab === "subscriber" && <SubscriberView />}
          {tab === "merchant" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <MerchantPlans refresh={refresh} />
              <CreatePlanForm onSuccess={() => setRefresh((r) => r + 1)} />
            </div>
          )}
        </div>
      )}

      <footer style={{
        textAlign: "center", padding: "24px",
        borderTop: "0.5px solid #1a1a30",
        marginTop: 40,
      }}>
        <p style={{ fontSize: 11, color: "#303050" }}>
  ArcSubs · Open protocol on Arc Testnet · Contract 0xBB50...83EB0
</p>
      </footer>
    </main>
  );
}
