import React from "react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title = "CastPay", subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center text-yellow-300 font-bold">
        CP
      </div>
    </header>
  );
}
