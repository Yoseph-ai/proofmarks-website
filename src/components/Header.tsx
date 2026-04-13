"use client";
import Link from "next/link";
import React from "react";
import Badge from "./ui/Badge";

export default function Header() {
  return (
    <header className="w-full py-6 border-b bg-white/60 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="text-2xl font-semibold">Hedera Document Notary</div>
          <div className="text-sm text-gray-500">Immutable proof of existence</div>
        </Link>

        <nav className="flex items-center gap-3">
          <Link href="https://portal.hedera.com" target="_blank" rel="noreferrer">
            <Badge>
              <span className="w-2 h-2 rounded-full bg-emerald-700 inline-block" />
              Hedera Testnet
            </Badge>
          </Link>
        </nav>
      </div>
    </header>
  );
}
