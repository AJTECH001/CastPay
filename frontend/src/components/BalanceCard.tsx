import React from "react";
import Card from "./ui/Card";

interface BalanceCardProps {
  balance: string;
  token?: string;
}

export default function BalanceCard({ balance, token = "USDC" }: BalanceCardProps) {
  return (
    <Card className="p-5 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-slate-300 text-xs">Current balance</div>
      <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-100">
        {balance} <span className="text-slate-400 text-lg align-middle">{token}</span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 border border-slate-800 px-2 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Gasless via Paymaster
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 border border-slate-800 px-2 py-1">
          Arbitrum Stylus
        </span>
      </div>
    </Card>
  );
}
