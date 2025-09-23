import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export default function Input({ label, hint, className = "", ...props }: InputProps) {
  return (
    <label className="block w-full">
      {label && <span className="block text-xs font-medium text-slate-300 mb-1">{label}</span>}
      <input
        className={`w-full rounded-xl bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 h-11 px-3 ${className}`}
        {...props}
      />
      {hint && <span className="block text-[10px] text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}
