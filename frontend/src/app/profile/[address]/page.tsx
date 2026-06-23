"use client";

import { useParams } from "next/navigation";
import { Search, Copy, Check } from "lucide-react";
import { useState } from "react";
import { TokenImage } from "@/components/ui/TokenImage";

const transactions = [
  { type: "sell" as const, token: "PepeBNB", amount: "37779", bnb: "+1,31 BNB" },
  { type: "buy" as const, token: "PepeBNB", amount: "37779", bnb: "-1,21 BNB" },
  { type: "sell" as const, token: "PepeBNB", amount: "13379", bnb: "+1,31 BNB" },
  { type: "buy" as const, token: "PepeBNB", amount: "37779", bnb: "-1,21 BNB" },
  { type: "sell" as const, token: "PepeBNB", amount: "13379", bnb: "+1,31 BNB" },
];

const holdings = [
  { name: "ShibaInu BNB", change: "+0,23%", amount: "884123", bnb: "=0,312 BNB", address: "0x0000000000000000000000000000000000000001" },
  { name: "DogeCoin BNB", change: "+1,12%", amount: "512000", bnb: "=0,185 BNB", address: "0x0000000000000000000000000000000000000002" },
  { name: "PepeBNB", change: "-0,45%", amount: "245000", bnb: "=0,089 BNB", address: "0x0000000000000000000000000000000000000003" },
  { name: "WowDoge", change: "+3,21%", amount: "1200000", bnb: "=0,420 BNB", address: "0x0000000000000000000000000000000000000004" },
];

export default function ProfilePage() {
  const { address } = useParams<{ address: string }>();
  const addr = (address as string) ?? "";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-figma-bg min-h-screen px-5 pb-20">
      {/* ── Profile Card ── */}
      <div
        className="flex flex-col items-end gap-[18px] mt-8"
        style={{
          width: "709px",
          background: "#000000",
          borderRadius: "34px",
          padding: "26px 37px 25px",
        }}
      >
        {/* Top row: Avatar + Welcome */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-[23px]">
            {/* Avatar */}
            <div className="w-[49px] h-[49px] rounded-full bg-figma-purple flex items-center justify-center text-white font-bold text-lg shrink-0">
              {addr.slice(2, 4).toUpperCase()}
            </div>
            {/* Welcome + Username */}
            <div className="flex flex-col gap-[6px]">
              <span className="text-figma-white font-figma-regular text-figma-13">Welcome Back</span>
              <span className="text-figma-white font-figma-bold text-figma-16">
                @{addr.slice(0, 8)}...
              </span>
            </div>
          </div>
          {/* Edit profile */}
          <div
            className="flex items-center justify-center h-[32px]"
            style={{
              background: "#7DC832",
              borderRadius: "9px",
              padding: "9px 28px",
            }}
          >
            <span className="text-figma-gray font-figma-regular text-figma-11">edit profile</span>
          </div>
        </div>

        {/* Connected Wallets */}
        <div className="flex flex-col gap-[15px] w-[635px]">
          <span className="text-figma-white font-figma-bold text-figma-15">Connected Wallets:</span>

          {/* Solana */}
          <div className="flex flex-col gap-0">
            <span className="text-figma-inactive font-figma-regular text-figma-11">Solana</span>
            <div
              className="flex items-center gap-[16px] w-[624px] h-[47px]"
              style={{
                background: "#7DC832",
                borderRadius: "12px",
                padding: "15px 28px",
              }}
            >
              <svg width="19" height="15" viewBox="0 0 19 15" fill="none">
                <circle cx="9.5" cy="7.5" r="7" fill="white" />
              </svg>
              <span className="text-figma-white font-figma-regular text-figma-14 flex-1">
                9AM7qUcUZzU4DpwTXzcF8cQzWpzDm8fFfZktSg3aBufL
              </span>
              <button onClick={handleCopy}>
                {copied ? <Check className="w-[22px] h-[22px] text-white" /> : <Copy className="w-[22px] h-[22px] text-white" />}
              </button>
            </div>
          </div>

          {/* Binance */}
          <div className="flex flex-col gap-0">
            <span className="text-figma-inactive font-figma-regular text-figma-11">Binance smart chain</span>
            <div
              className="flex items-center gap-[15px] w-[624px] h-[47px]"
              style={{
                background: "#7DC832",
                borderRadius: "12px",
                padding: "13px 28px",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#F0B90B" />
              </svg>
              <span className="text-figma-white font-figma-regular text-figma-14 flex-1">
                9AM7qUcUZzU4DpwTXzcF8cQzWpzDm8fFfZktSg3aBufL
              </span>
              <button onClick={handleCopy}>
                <Copy className="w-[22px] h-[22px] text-white" />
              </button>
            </div>
          </div>

          {/* Ethereum */}
          <div className="flex flex-col gap-0">
            <span className="text-figma-inactive font-figma-regular text-figma-11">Ethereum</span>
            <div
              className="flex items-center gap-[18px] w-[624px] h-[50px]"
              style={{
                background: "#7DC832",
                borderRadius: "12px",
                padding: "11px 29px",
              }}
            >
              <svg width="16" height="26" viewBox="0 0 16 26" fill="none">
                <path d="M8 0L0 13L8 18L16 13L8 0Z" fill="white" />
              </svg>
              <span className="text-figma-white font-figma-regular text-figma-14 flex-1">
                9AM7qUcUZzU4DpwTXzcF8cQzWpzDm8fFfZktSg3aBufL
              </span>
              <button onClick={handleCopy}>
                <Copy className="w-[22px] h-[22px] text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Earnings Panel ── */}
      <div
        className="flex flex-col gap-[43px]"
        style={{
          position: "absolute",
          left: "1036px",
          top: "130px",
          width: "345px",
          background: "#000000",
          borderRadius: "30px",
          padding: "34px 35px",
        }}
      >
        {/* Earnings info */}
        <div className="flex flex-col gap-[13px]">
          <div className="flex flex-col gap-[7px]">
            <span className="text-figma-white font-figma-semibold text-figma-22">Earnings</span>
            <span className="text-figma-green font-figma-medium text-figma-15">Total Expense</span>
          </div>
          <span className="text-figma-purple font-figma-bold" style={{ fontSize: "32px" }}>
            $6078.76
          </span>
          <span className="text-figma-green font-figma-medium text-figma-14">
            Keep Pumping Those Numbers
          </span>
        </div>

        {/* Donut chart placeholder */}
        <div className="relative w-[269px] h-[130px] mx-auto">
          <svg width="269" height="130" viewBox="0 0 269 130">
            <circle cx="135" cy="130" r="120" fill="none" stroke="#1B1B1B" strokeWidth="20" />
            <circle cx="135" cy="130" r="120" fill="none" stroke="#6E44D2" strokeWidth="20"
              strokeDasharray="377" strokeDashoffset="75" strokeLinecap="round" />
            <text x="135" y="90" textAnchor="middle" fill="white" fontSize="37" fontWeight="bold" fontFamily="Inter">80%</text>
          </svg>
        </div>
      </div>

      {/* ── Latest Transactions ── */}
      <div
        className="flex flex-col gap-[12px]"
        style={{
          position: "absolute",
          left: "1036px",
          top: "530px",
          width: "345px",
          background: "#000000",
          borderRadius: "30px",
          padding: "26px 23px",
        }}
      >
        <div className="flex flex-col gap-[7px]">
          <span className="text-figma-white font-figma-semibold text-figma-22">Latest Transactions</span>
        </div>

        {transactions.map((tx, i) => (
          <div key={i}>
            <div className="flex items-center justify-between w-full">
              <span className="text-figma-white font-figma-medium text-figma-12">
                {tx.type === "sell" ? "Sold" : "Bought"} {tx.amount} {tx.token}
              </span>
              <div
                className="flex items-center justify-center h-[29px]"
                style={{
                  background: "#7DC832",
                  borderRadius: "4px",
                  padding: "7px 15px",
                }}
              >
                <span className={tx.type === "buy" ? "text-figma-red" : "text-figma-purple"} style={{ fontSize: "12px" }}>
                  {tx.bnb}
                </span>
              </div>
            </div>
            {i < transactions.length - 1 && (
              <hr className="border-0 h-px my-[3px]" style={{ background: "rgba(255,255,255,0.25)", opacity: 0.25 }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Holdings ── */}
      <div
        className="flex flex-col gap-[10px] mt-[29px]"
        style={{
          width: "709px",
          background: "#000000",
          borderRadius: "34px",
          padding: "31px 37px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <span className="text-figma-white font-figma-semibold text-figma-22">Holdings</span>
          <span className="text-figma-white font-figma-regular text-figma-16">
            Total networth: $9,231 / <span className="font-semibold text-figma-purple">**+43%**</span>
          </span>
        </div>

        {/* Holding rows */}
        <div className="flex flex-col gap-[12px]">
          {holdings.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between w-full"
              style={{
                background: "#7DC832",
                borderRadius: "12px",
                padding: "18px 26px 16px 26px",
              }}
            >
              {/* Left: icon + name */}
              <div className="flex items-center gap-[21px]">
                <TokenImage
                  tokenAddress={h.address}
                  tokenName={h.name}
                  size="md"
                  round
                />
                <div className="flex flex-col gap-[3px]">
                  <span className="text-figma-card font-figma-semibold text-figma-16">{h.name}</span>
                  <span className="text-figma-purple font-figma-semibold text-figma-16">{h.change}</span>
                </div>
              </div>
              {/* Right: amount + BNB value */}
              <div className="flex flex-col gap-[3px] items-end">
                <span className="text-figma-card font-figma-semibold text-figma-16 text-right">{h.amount}</span>
                <span className="text-figma-card font-figma-regular text-figma-16 text-right" style={{ opacity: 0.53 }}>
                  {h.bnb}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}