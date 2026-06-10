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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading certificate…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border rounded p-8 shadow text-center">
          <p className="text-red-600 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  // Extract data (same fields returned by /api/certificate)
  const {
    hash,
    timestampIso,
    network,
    topicId,
    sequenceNumber,
    mirrorNodeUrl,
    fileName,
    timestamp,
  } = data;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white border-2 border-blue-800 p-8 shadow-lg">
        {/* Double border effect (mimicking the PDF) */}
        <div className="border border-gray-300 p-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/yes-logo.png"
              alt="Proofmarks"
              className="h-16"
            />
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-center text-gray-900 mb-8">
            CERTIFICATE OF DIGITAL AUTHENTICITY
          </h1>

          {/* Data grid – matching the PDF fields */}
          <div className="space-y-3 text-sm">
            {fileName && (
              <div className="flex">
                <span className="font-bold w-40 text-gray-600">File Name:</span>
                <span className="font-medium">{fileName}</span>
              </div>
            )}
            <div className="flex">
              <span className="font-bold w-40 text-gray-600">Algorithm:</span>
              <span>SHA-256</span>
            </div>
            {network && (
              <div className="flex">
                <span className="font-bold w-40 text-gray-600">Network:</span>
                <span className="capitalize">{network}</span>
              </div>
            )}
            <div className="flex">
              <span className="font-bold w-40 text-gray-600">Certificate ID:</span>
              <span className="font-mono text-xs">{certificateId}</span>
            </div>
            {sequenceNumber && (
              <div className="flex">
                <span className="font-bold w-40 text-gray-600">Sequence:</span>
                <span>{sequenceNumber}</span>
              </div>
            )}
            {timestampIso && (
              <div className="flex">
                <span className="font-bold w-40 text-gray-600">Timestamp (UTC):</span>
                <span className="text-xs">{timestampIso}</span>
              </div>
            )}
          </div>

          {/* Cryptographic Hash – single line */}
          {hash && (
            <div className="mt-6">
              <p className="font-bold text-gray-600 text-sm">
                Cryptographic Hash (SHA-256):
              </p>
              <p className="font-mono text-xs text-gray-500 mt-1 break-all">
                {hash}
              </p>
            </div>
          )}

          {/* Independent Verification Link – direct Mirror Node URL */}
          {mirrorNodeUrl && topicId && sequenceNumber && (
            <div className="mt-6 pt-4 border-t text-center">
              <p className="font-bold text-xs text-gray-600 mb-1">
                Verify Independently:
              </p>
              <p className="text-xs text-blue-700 break-all">
                {`${mirrorNodeUrl}/api/v1/topics/${topicId}/messages/${sequenceNumber}`}
              </p>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            This document serves as a detached proof of existence. The original
            asset remains unaltered.
          </p>
        </div>
      </div>
    </div>
  );
}