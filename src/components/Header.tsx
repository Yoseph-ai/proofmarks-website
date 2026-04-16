"use client";
import Link from "next/link";
import Image from "next/image";
import Badge from "./ui/Badge";

export default function Header() {
  return (
    <header className="w-full py-6 border-b bg-white/60 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {/* Logo — using your "YES FINANCIAL SOLUTIONS" image */}
          <div className="relative h-16 w-16 flex-shrink-0">
            <Image
              src="/yes-logo.png"
              alt="YES Financial Solutions"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="text-2xl font-semibold">Hedera Trust Anchor</div>
            <div className="text-sm text-gray-500">Immutable proof for digital assets</div>
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
