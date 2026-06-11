"use client";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full py-6 border-b bg-white/60 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-center">
        <Link href="https://proofmarks.cloud" className="flex items-center gap-2">
          <img
            src="/lock.svg"
            alt="Proofmarks"
            className="h-8 w-8"
          />
          <span className="text-2xl font-bold uppercase tracking-widest">
            Proofmarks
          </span>
        </Link>
      </div>
    </header>
  );
}