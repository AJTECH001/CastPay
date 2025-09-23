import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur ${className}`}>
      {children}
    </div>
  );
}
