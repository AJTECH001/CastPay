import React from "react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title = "CastPay", subtitle }: HeaderProps) {
  const apiBase = (import.meta as any).env?.VITE_API_BASE || 'not set';

  return (
    <header className="mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center text-yellow-300 font-bold">
          CP
        </div>
      </div>
      <div className="mt-2 text-[10px] text-slate-500 font-mono truncate">
        API: {apiBase}
      </div>
    </header>
  );
}
