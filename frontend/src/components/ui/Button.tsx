import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  full?: boolean;
}

export default function Button({ className, variant = "primary", full, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-60 disabled:cursor-not-allowed h-11 px-4 text-sm";
  const styles: Record<string, string> = {
    primary: "bg-yellow-400 text-slate-900 hover:bg-yellow-300",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
    ghost: "bg-transparent text-yellow-400 hover:bg-yellow-400/10",
  };
  return (
    <button
      className={cn(base, styles[variant], full && "w-full", className)}
      {...props}
    />
  );
}
