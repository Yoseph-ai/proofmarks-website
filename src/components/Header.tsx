"use client";
import Link from "next/link";
import Badge from "./ui/Badge";

export default function Header() {
  return (
    <header className="w-full py-6 border-b bg-white/60 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {/* Lock SVG + Proofmarks text */}
          <div className="flex items-center gap-2">
            <img
              src="/lock.svg"
              alt="Proofmarks lock icon"
              className="h-8 w-8"
            />
            <span className="text-2xl font-bold">Proofmarks</span>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          <Badge>
            <span className="w-2 h-2 rounded-full bg-emerald-700 inline-block mr-1.5" />
            Hedera Testnet
          </Badge>
        </nav>
      </div>
    </header>
  );
}