import React from "react";
import Card from "./ui/Card";

export interface TxItem {
  id: string;
  direction: "in" | "out";
  counterparty: string; // @username
  amount: string; // e.g. "5"
  token?: string; // e.g. "USDC"
  date?: string; // ISO or display
}

interface TransactionsProps {
  items: TxItem[];
}

export default function Transactions({ items }: TransactionsProps) {
  return (
    <Card className="mt-4 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-200">Recent transactions</h3>
        <button className="text-xs text-yellow-400 hover:underline">View all</button>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-500">No transactions yet.</div>
      ) : (
        <ul className="divide-y divide-slate-800">
          {items.map((tx) => (
            <li key={tx.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center border ${tx.direction === "out" ? "bg-slate-800 border-slate-700" : "bg-emerald-900/30 border-emerald-700/40"}`}>
                  <span className={tx.direction === "out" ? "text-slate-300" : "text-emerald-300"}>
                    {tx.direction === "out" ? "→" : "←"}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-slate-200">
                    {tx.direction === "out" ? "To" : "From"} <span className="font-semibold">{tx.counterparty}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{tx.date || ""}</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-slate-100">
                {tx.direction === "out" ? "-" : "+"}
                {tx.amount} <span className="text-slate-400">{tx.token || "USDC"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
