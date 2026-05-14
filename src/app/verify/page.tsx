"use client";
import React, { useCallback, useState } from "react";
import DragDrop from "../../components/DragDrop";

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Convert a raw seconds.nanoseconds timestamp to ISO 8601 with full nanos. */
function formatTimestamp(rawTimestamp: string): string {
  if (!rawTimestamp) return "N/A";
  const [secondsStr, nanosStr = "0"] = rawTimestamp.split(".");
  const seconds = parseInt(secondsStr, 10);
  const date = new Date(seconds * 1000);
  const isoWithoutFraction = date.toISOString().replace(/\.\d+Z$/, "Z");
  return isoWithoutFraction.replace("Z", `.${nanosStr.padStart(9, "0")}Z`);
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
      // 1. RE-HASH: Compute the hash of the file currently in the user's hand
      const ab = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", ab);
      const hex = toHex(digest);
      setHashing(false);

      setLoading(true);
      // 2. COMPARISON: Send this hash to the API to see if it matches the ledger
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

      // Merge API response with the local hash and file name
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
                  // --- MATCH FOUND: show the formal certificate ---
                  <div className="max-w-2xl mx-auto bg-white border-2 border-emerald-700 p-8 shadow-lg">
                    {/* Double border effect (matching the PDF) */}
                    <div className="border border-emerald-200 p-6">
                      {/* Logo */}
                      <div className="flex justify-center mb-6">
                        <img
                          src="/yes-logo.png"
                          alt="Hedera Trust Anchor"
                          className="h-16"
                        />
                      </div>

                      {/* Title */}
                      <h1 className="text-xl font-bold text-center text-gray-900 mb-8">
                        CERTIFICATE OF DIGITAL AUTHENTICITY
                      </h1>

                      {/* Data grid – matching the PDF fields */}
                      <div className="space-y-3 text-sm">
                        <div className="flex">
                          <span className="font-bold w-40 text-gray-600">File Name:</span>
                          <span className="font-medium">{result.fileName}</span>
                        </div>
                        <div className="flex">
                          <span className="font-bold w-40 text-gray-600">Algorithm:</span>
                          <span>SHA-256</span>
                        </div>
                        {result.network && (
                          <div className="flex">
                            <span className="font-bold w-40 text-gray-600">Network:</span>
                            <span className="capitalize">{result.network}</span>
                          </div>
                        )}
                        <div className="flex">
                          <span className="font-bold w-40 text-gray-600">Certificate ID:</span>
                          <span className="font-mono text-xs">{result.certificateId}</span>
                        </div>
                        {result.sequenceNumber && (
                          <div className="flex">
                            <span className="font-bold w-40 text-gray-600">Sequence:</span>
                            <span>{result.sequenceNumber}</span>
                          </div>
                        )}
                        {result.timestamp && (
                          <div className="flex">
                            <span className="font-bold w-40 text-gray-600">Timestamp (UTC):</span>
                            <span className="text-xs">{formatTimestamp(result.timestamp)}</span>
                          </div>
                        )}
                      </div>

                      {/* Cryptographic Hash – single line */}
                      <div className="mt-6">
                        <p className="font-bold text-gray-600 text-sm">
                          Cryptographic Hash (SHA-256):
                        </p>
                        <p className="font-mono text-xs text-gray-500 mt-1 break-all">
                          {result.hash}
                        </p>
                      </div>

                      {/* Independent Verification Link */}
                      {result.mirrorNodeUrl && result.certificateId && (
                        <div className="mt-6 pt-4 border-t text-center">
                          <p className="font-bold text-xs text-gray-600 mb-1">
                            Verify Independently:
                          </p>
                          <p className="text-xs text-blue-700 break-all">
                            {`${result.mirrorNodeUrl}/api/v1/topics/${result.certificateId.replace('@', '/messages/')}`}
                          </p>
                        </div>
                      )}

                      {/* Footer */}
                      <p className="text-center text-xs text-gray-400 mt-6">
                        This document serves as a detached proof of existence. The original asset remains unaltered.
                      </p>
                    </div>
                  </div>
                ) : (
                  // --- NO MATCH: show failure ---
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
        </div>
      </main>
    </div>
  );
}