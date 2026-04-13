"use client";
import React, { useCallback, useState } from "react";
import Header from "../../components/Header";
import DragDrop from "../../components/DragDrop";

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function VerifyPage() {
  const [hashing, setHashing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    try {
      setHashing(true);
      const ab = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", ab);
      const hex = toHex(digest);
      setHashing(false);

      setLoading(true);
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: hex }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data?.error || "Server error");
        return;
      }

      setResult({ ...data, hash: hex, fileName: file.name });
    } catch (err: any) {
      console.error(err);
      setHashing(false);
      setLoading(false);
      setError(err?.message || "Unexpected error");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-4">Verify a document</h2>

        <DragDrop onFile={onFile} maxSizeBytes={10 * 1024 * 1024} />

        <div className="mt-6">
          {hashing && <div className="text-sm text-gray-600">Computing SHA-256…</div>}
          {loading && <div className="text-sm text-gray-600">Checking Hedera…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          {result && (
            <div className="mt-4">
              {result.exists ? (
                <div className="p-4 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                  ✅ Verified on Hedera
                  <div className="text-xs mt-2">Timestamp: {result.timestamp}</div>
                  <div className="text-xs">Sequence: {result.sequenceNumber}</div>
                  <div className="text-xs font-mono break-words mt-2">Hash: {result.hash}</div>
                </div>
              ) : (
                <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-800">❌ Not found on Hedera</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
