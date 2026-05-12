"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function CertificateVerificationPage() {
  const params = useParams();
  const certificateId = params.certificateId as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/certificate/${certificateId}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Certificate not found");
        }
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message || "Failed to load certificate");
      } finally {
        setLoading(false);
      }
    })();
  }, [certificateId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white border rounded-lg p-6 shadow">
        {loading && (
          <div className="text-center text-gray-500">Loading certificate…</div>
        )}
        {error && (
          <div className="text-center text-red-600">{error}</div>
        )}
        {data && (
          <>
            <div className="flex justify-center mb-4">
              <img src="/yes-logo.png" alt="Hedera Trust Anchor" className="h-16" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-4">✅ Verified on Hedera</h2>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-gray-600 font-medium">Certificate ID</dt>
                <dd className="font-mono text-xs">{data.certificateId}</dd>
              </div>
              {data.network && (
                <div>
                  <dt className="text-gray-600">Network</dt>
                  <dd className="capitalize">{data.network}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-600">Hash (SHA‑256)</dt>
                <dd className="font-mono text-xs break-all">{data.hash}</dd>
              </div>
              {data.timestampIso && (
                <div>
                  <dt className="text-gray-600">Timestamp (UTC)</dt>
                  <dd className="text-xs">{data.timestampIso}</dd>
                </div>
              )}
              <div className="mt-2 pt-2 border-t">
                <dt className="text-gray-600">Verify independently</dt>
                <dd>
                  <a
                    className="text-emerald-700 underline text-xs break-all"
                    target="_blank"
                    rel="noreferrer"
                    href={`${data.mirrorNodeUrl}/api/v1/topics/${data.topicId}/messages/${data.sequenceNumber}`}
                  >
                    {`${data.mirrorNodeUrl}/api/v1/topics/${data.topicId}/messages/${data.sequenceNumber}`}
                  </a>
                </dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </div>
  );
}