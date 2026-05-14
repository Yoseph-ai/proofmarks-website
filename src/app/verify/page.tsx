"use client";
import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import DragDrop from "../../components/DragDrop";

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatTimestamp(rawTimestamp: string): string {
  if (!rawTimestamp) return "N/A";
  const [secondsStr, nanosStr = "0"] = rawTimestamp.split(".");
  const seconds = parseInt(secondsStr, 10);
  const date = new Date(seconds * 1000);
  const isoWithoutFraction = date.toISOString().replace(/\.\d+Z$/, "Z");
  return isoWithoutFraction.replace("Z", `.${nanosStr.padStart(9, "0")}Z`);
}

export default function VerifyPage() {
  const router = useRouter();
  const [hashing, setHashing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certIdInput, setCertIdInput] = useState("");

  const handleCertIdLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = certIdInput.trim();
    if (trimmed) router.push(`/verify/${trimmed}`);
  };

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
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Document Verification Portal</h2>
          <p className="text-gray-600 mt-2">
            Upload the document to verify its authenticity against the Hedera immutable ledger.
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <DragDrop onFile={onFile} maxSizeBytes={10 * 1024 * 1024} />

          <div className="mt-6">
            {hashing && (
              <div className="flex items-center justify-center gap-3 text-sm text-gray-600 animate-pulse">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                Computing local SHA-256 fingerprint...
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center gap-3 text-sm text-gray-600 animate-pulse">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                Comparing fingerprint with Hedera Mirror Node...
              </div>
            )}
            {error && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-600 text-center text-sm">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-8">
                {result.exists ? (
                  <div className="p-6 rounded-lg bg-emerald-50 border-2 border-emerald-500 text-emerald-900 shadow-inner">
                    <div className="flex flex-col items-center text-center mb-6">
                      <img src="/yes-logo.png" alt="YES Financial Solutions" className="h-16 mb-4" />
                      <div className="text-2xl font-bold flex items-center gap-2">
                        <span>✅</span> AUTHENTICITY VERIFIED
                      </div>
                      <p className="text-emerald-700 text-sm mt-1">
                        The uploaded file matches the immutable record anchored on the Hedera network.
                      </p>
                    </div>

                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border border-emerald-200">
                        <dt className="text-emerald-700 font-bold uppercase text-xs">Original File</dt>
                        <dd className="text-gray-900 font-medium">{result.fileName}</dd>
                      </div>
                      <div className="bg-white p-3 rounded border border-emerald-200">
                        <dt className="text-emerald-700 font-bold uppercase text-xs">Hashing Algorithm</dt>
                        <dd className="text-gray-900 font-medium">SHA-256</dd>
                      </div>
                      <div className="bg-white p-3 rounded border border-emerald-200">
                        <dt className="text-emerald-700 font-bold uppercase text-xs">Network</dt>
                        <dd className="text-gray-900 font-medium capitalize">{result.network}</dd>
                      </div>
                      <div className="bg-white p-3 rounded border border-emerald-200">
                        <dt className="text-emerald-700 font-bold uppercase text-xs">Certificate ID</dt>
                        <dd className="text-gray-900 font-mono text-xs">{result.certificateId}</dd>
                      </div>
                      <div className="bg-white p-3 rounded border border-emerald-200">
                        <dt className="text-emerald-700 font-bold uppercase text-xs">Sequence Number</dt>
                        <dd className="text-gray-900 font-medium">{result.sequenceNumber}</dd>
                      </div>
                      {result.transactionId && (
                        <div className="bg-white p-3 rounded border border-emerald-200">
                          <dt className="text-emerald-700 font-bold uppercase text-xs">Hedera Transaction</dt>
                          <dd>
                            <a
                              className="text-emerald-700 underline text-xs font-mono"
                              target="_blank"
                              rel="noreferrer"
                              href={`https://hashscan.io/${result.network || "testnet"}/transaction/${encodeURIComponent(result.transactionId)}`}
                            >
                              {result.transactionId}
                            </a>
                          </dd>
                        </div>
                      )}
                      <div className="bg-white p-3 rounded border border-emerald-200">
                        <dt className="text-emerald-700 font-bold uppercase text-xs">Consensus Timestamp</dt>
                        <dd className="text-gray-900 text-xs font-mono">
                          {formatTimestamp(result.timestamp)}
                        </dd>
                      </div>
                    </dl>

                    {result.timestamp && (
                      <div className="mt-2 text-center text-xs text-gray-500">
                        Raw consensus timestamp: {result.timestamp}
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-white rounded border border-emerald-200">
                      <dt className="text-emerald-700 font-bold uppercase text-xs mb-2">Verified Fingerprint (Hash)</dt>
                      <dd className="font-mono text-xs break-all text-gray-600">
                        {result.hash}
                      </dd>
                    </div>

                    {result.mirrorNodeUrl && result.certificateId && (
                      <div className="mt-6 pt-4 border-t border-emerald-200 text-center">
                        <p className="text-xs text-emerald-700 font-medium mb-2">Verify this record independently on the Hedera Mirror Node:</p>
                        <a
                          className="text-emerald-600 underline text-xs break-all hover:text-emerald-800 transition"
                          target="_blank"
                          rel="noreferrer"
                          href={`${result.mirrorNodeUrl}/api/v1/topics/${result.certificateId.replace('@', '/messages/')}`}
                        >
                          {`${result.mirrorNodeUrl}/api/v1/topics/${result.certificateId.replace('@', '/messages/')}`}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-lg bg-rose-50 border-2 border-rose-500 text-rose-900 text-center shadow-inner">
                    <div className="text-3xl mb-2">❌</div>
                    <div className="text-xl font-bold">Verification Failed</div>
                    <p className="text-sm mt-1">
                      This file does not match any anchored record on the Hedera network. It may have been altered or was never timestamped.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-10 pt-6 border-t text-center">
            <p className="text-sm text-gray-600 mb-3">
              Already have a Certificate ID? Enter it below to view the certificate details.
            </p>
            <form onSubmit={handleCertIdLookup} className="flex justify-center gap-2">
              <input
                type="text"
                value={certIdInput}
                onChange={(e) => setCertIdInput(e.target.value)}
                placeholder="e.g. 0.0.8626999@6"
                className="border rounded px-3 py-2 text-sm w-64 font-mono"
              />
              <button
                type="submit"
                className="rounded bg-emerald-700 px-4 py-2 text-white text-sm hover:bg-emerald-800 transition"
              >
                View Certificate
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}