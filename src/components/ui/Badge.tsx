"use client";
import React from "react";

export default function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm bg-emerald-100 text-emerald-800">{children}</span>;
}
