"use client";
import React from "react";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost";
};

export default function Button({ variant = "default", className = "", ...props }: Props) {
  const base = "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium";
  const variants: Record<string, string> = {
    default: "bg-emerald-600 text-white hover:bg-emerald-700",
    secondary: "bg-slate-700 text-white hover:bg-slate-800",
    ghost: "bg-transparent text-slate-700",
  };
  const cls = `${base} ${variants[variant]} ${className}`.trim();
  return <button {...props} className={cls} />;
}
