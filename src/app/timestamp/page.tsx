"use client";
import React, { useCallback, useState } from "react";
import Header from "../../components/Header";
import DragDrop from "../../components/DragDrop";
import Certificate from "../../components/Certificate";

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function TimestampPage() {
  const [loading, setLoading] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setFileName(file.name);

    try {
      setHashing(true);
      const ab = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", ab);
      const hex = toHex(digest);
      setHashing(false);

      setLoading(true);
      const res = await fetch("/api/timestamp", {
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

      setResult({ ...data, hash: hex });
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
        <h2 className="text-2xl font-semibold mb-4">Submit & Timestamp a document</h2>

        <DragDrop onFile={onFile} maxSizeBytes={10 * 1024 * 1024} />

        <div className="mt-6">
          {hashing && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
              </svg>
              Computing SHA-256…
            </div>
          )}

          {loading && (
            <div className="text-sm text-gray-600 mt-3">Submitting to Hedera, please wait…</div>
          )}

          {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

          {result && (
            <div className="mt-6">
              <Certificate
                fileName={fileName || "(unknown)"}
                hash={result.hash}
                transactionId={result.transactionId}
                timestamp={result.timestamp}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
