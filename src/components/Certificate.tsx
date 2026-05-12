"use client";
import React from "react";

type Props = {
  fileName: string;
  hash: string;
  transactionId?: string;
  timestamp?: string | null;           // raw consensus timestamp (seconds.nanoseconds)
  // New enriched fields
  network?: string;
  mirrorNodeUrl?: string;
  hashAlgorithm?: string;
  submittedBy?: string;
  timestampIso?: string;               // full-precision ISO 8601
  certificateId?: string;              // e.g. "0.0.4691086@41"
  logoUrl?: string | null;
};

export default function Certificate({
  fileName,
  hash,
  transactionId,
  timestamp,
  network,
  mirrorNodeUrl,
  hashAlgorithm,
  submittedBy,
  timestampIso,
  certificateId,
  logoUrl,
}: Props) {
  return (
    <div className="border rounded-lg p-6 bg-gray-50">
      {/* Logo at the top */}
      {logoUrl && (
        <div className="flex justify-center mb-4">
          <img src={logoUrl} alt="Service logo" className="h-16" />
        </div>
      )}

      <h3 className="text-lg font-semibold mb-3">Timestamp Certificate</h3>
      <dl className="grid grid-cols-1 gap-2 text-sm">
        <div>
          <dt className="text-gray-600">File name</dt>
          <dd className="font-medium">{fileName}</dd>
        </div>

        {/* Hashing algorithm if provided */}
        {hashAlgorithm && (
          <div>
            <dt className="text-gray-600">Hash algorithm</dt>
            <dd className="font-mono text-xs">{hashAlgorithm}</dd>
          </div>
        )}

        <div>
          <dt className="text-gray-600">SHA-256</dt>
          <dd className="font-mono text-xs break-words">{hash}</dd>
        </div>

        {/* Network */}
        {network && (
          <div>
            <dt className="text-gray-600">Network</dt>
            <dd className="font-medium capitalize">{network}</dd>
          </div>
        )}

        {/* Issuer (submitted by) */}
        {submittedBy && (
          <div>
            <dt className="text-gray-600">Submitted by</dt>
            <dd className="font-mono text-xs">{submittedBy}</dd>
          </div>
        )}

        {/* Certificate ID (topicId@sequenceNumber) */}
        {certificateId && (
          <div>
            <dt className="text-gray-600">Certificate ID</dt>
            <dd className="font-mono text-xs">{certificateId}</dd>
          </div>
        )}

        {transactionId && (
          <div>
            <dt className="text-gray-600">Hedera Transaction</dt>
            <dd>
              <a
                className="text-emerald-700 underline"
                target="_blank"
                rel="noreferrer"
                href={`https://hashscan.io/testnet/transaction/${encodeURIComponent(transactionId)}`}
              >
                {transactionId}
              </a>
            </dd>
          </div>
        )}

        {/* Full-precision ISO timestamp (from the ledger) */}
        {timestampIso && (
          <div>
            <dt className="text-gray-600">Timestamp (UTC)</dt>
            <dd className="font-medium">{new Date(timestampIso).toLocaleString()} (UTC)</dd>
            <dd className="text-xs text-gray-500">{timestampIso}</dd>
          </div>
        )}

        {/* Fallback to old timestamp if new field absent */}
        {!timestampIso && timestamp && (
          <div>
            <dt className="text-gray-600">Timestamp</dt>
            <dd className="font-medium">{new Date(timestamp).toLocaleString()}</dd>
          </div>
        )}

        {/* Mirror Node verification link */}
        {mirrorNodeUrl && certificateId && (
          <div className="mt-2 pt-2 border-t">
            <dt className="text-gray-600">Verify on Mirror Node</dt>
            <dd>
              <a
                className="text-emerald-700 underline text-xs"
                target="_blank"
                rel="noreferrer"
                href={`${mirrorNodeUrl}/api/v1/topics/${certificateId.replace('@', '/messages/')}`}
              >
                {`${mirrorNodeUrl}/api/v1/topics/${certificateId.replace('@', '/messages/')}`}
              </a>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}