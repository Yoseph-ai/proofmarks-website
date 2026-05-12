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
        <h2 className="text-2xl font-semibold mb-4">Verify a document</h2>

        <DragDrop onFile={onFile} maxSizeBytes={10 * 1024 * 1024} />

        <div className="mt-6">
          {hashing && <div className="text-sm text-gray-600">Computing SHA‑256…</div>}
          {loading && <div className="text-sm text-gray-600">Checking Hedera…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          {result && (
            <div className="mt-4">
              {result.exists ? (
                <div className="p-4 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                  {/* Logo (static, always present) */}
                  <div className="flex justify-center mb-2">
                    <img src="/yes-logo.png" alt="Hedera Trust Anchor" className="h-12" />
                  </div>

                  <p className="font-semibold text-base">✅ Verified on Hedera</p>

                  <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-emerald-900">
                    {/* File name */}
                    {result.fileName && (
                      <div>
                        <dt className="text-emerald-700 font-medium">File</dt>
                        <dd>{result.fileName}</dd>
                      </div>
                    )}

                    {/* Hash algorithm */}
                    <div>
                      <dt className="text-emerald-700 font-medium">Algorithm</dt>
                      <dd>SHA‑256</dd>
                    </div>

                    {/* Network */}
                    {result.network && (
                      <div>
                        <dt className="text-emerald-700 font-medium">Network</dt>
                        <dd className="capitalize">{result.network}</dd>
                      </div>
                    )}

                    {/* Certificate ID */}
                    {result.certificateId && (
                      <div>
                        <dt className="text-emerald-700 font-medium">Certificate ID</dt>
                        <dd className="font-mono text-xs">{result.certificateId}</dd>
                      </div>
                    )}

                    {/* Sequence */}
                    <div>
                      <dt className="text-emerald-700 font-medium">Sequence</dt>
                      <dd>{result.sequenceNumber}</dd>
                    </div>

                    {/* Human‑readable timestamp with full nanos */}
                    {result.timestamp && (
                      <div>
                        <dt className="text-emerald-700 font-medium">Timestamp (UTC)</dt>
                        <dd className="text-xs">{formatTimestamp(result.timestamp)}</dd>
                      </div>
                    )}

                    {/* Hash */}
                    <div>
                      <dt className="text-emerald-700 font-medium">Hash</dt>
                      <dd className="font-mono text-xs break-words">{result.hash}</dd>
                    </div>

                    {/* Direct Mirror Node link */}
                    {result.mirrorNodeUrl && result.certificateId && (
                      <div className="mt-2 pt-2 border-t border-emerald-200">
                        <dt className="text-emerald-700 font-medium">Verify independently</dt>
                        <dd>
                          <a
                            className="text-emerald-600 underline text-xs break-all"
                            target="_blank"
                            rel="noreferrer"
                            href={`${result.mirrorNodeUrl}/api/v1/topics/${result.certificateId.replace('@', '/messages/')}`}
                          >
                            {`${result.mirrorNodeUrl}/api/v1/topics/${result.certificateId.replace('@', '/messages/')}`}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              ) : (
                <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-800">
                  ❌ Not found on Hedera
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}