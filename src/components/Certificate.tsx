"use client";
import React from "react";

type Props = {
  fileName: string;
  hash: string;
  transactionId?: string;
  timestamp?: string | null;
};

export default function Certificate({ fileName, hash, transactionId, timestamp }: Props) {
  return (
    <div className="border rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-semibold mb-3">Timestamp Certificate</h3>
      <dl className="grid grid-cols-1 gap-2 text-sm">
        <div>
          <dt className="text-gray-600">File name</dt>
          <dd className="font-medium">{fileName}</dd>
        </div>

        <div>
          <dt className="text-gray-600">SHA-256</dt>
          <dd className="font-mono text-xs break-words">{hash}</dd>
        </div>

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

        {timestamp && (
          <div>
            <dt className="text-gray-600">Timestamp</dt>
            <dd className="font-medium">{new Date(timestamp).toLocaleString()}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
