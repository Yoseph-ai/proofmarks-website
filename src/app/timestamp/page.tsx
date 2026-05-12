"use client";
import React, { useCallback, useRef, useState } from "react";
import DragDrop from "../../components/DragDrop";
import Certificate from "../../components/Certificate";
import QRCode from "qrcode";
import { PDFDocument } from "pdf-lib";

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
  const [stampedPdfUrl, setStampedPdfUrl] = useState<string | null>(null);
  const [stamping, setStamping] = useState(false);
  // keep original file bytes for stamping later
  const fileBytesRef = useRef<Uint8Array | null>(null);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setStampedPdfUrl(null);
    setFileName(file.name);

    try {
      setHashing(true);
      const ab = await file.arrayBuffer();
      fileBytesRef.current = new Uint8Array(ab.slice(0)); // copy bytes
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

      // --- Start QR + stamping process ---
      setStamping(true);
      try {
        // Build the verification URL (public page we'll create soon)
        const verificationUrl = `${window.location.origin}/verify/${data.certificateId}`;
        // Generate QR code as a data URL (PNG)
        const qrDataUrl = await QRCode.toDataURL(verificationUrl);

        // Convert QR data URL to bytes (for pdf-lib)
        const qrResponse = await fetch(qrDataUrl);
        const qrImageBytes = await qrResponse.arrayBuffer();

        // Load the original PDF
        const pdfDoc = await PDFDocument.load(fileBytesRef.current!);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        // Embed the QR image
        const qrImage = await pdfDoc.embedPng(new Uint8Array(qrImageBytes));

        // Place QR at bottom-right corner (adjust as needed)
        const { width, height } = firstPage.getSize();
        const qrSize = 80; // 80x80 points
        firstPage.drawImage(qrImage, {
          x: width - qrSize - 20,
          y: 20,
          width: qrSize,
          height: qrSize,
        });

const stampedBytes = await pdfDoc.save();
// Convert to a plain ArrayBuffer for TypeScript compatibility
const arrayBuffer = stampedBytes.buffer.slice(
  stampedBytes.byteOffset,
  stampedBytes.byteOffset + stampedBytes.byteLength
);
const blob = new Blob([arrayBuffer], { type: "application/pdf" });
const url = URL.createObjectURL(blob);
setStampedPdfUrl(url);

      } 
      catch (stampErr) {
        console.error("QR stamping failed:", stampErr);
        setError("Document timestamped but QR stamping failed. You can still download the original.");
      } finally {
        setStamping(false);
      }
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

          {stamping && (
            <div className="text-sm text-gray-600 mt-3">Stamping QR code onto PDF…</div>
          )}

          {error && <div className="text-sm text-red-600 mt-3">{error}</div>}

          {result && (
            <div className="mt-6">
              <Certificate
                fileName={fileName || "(unknown)"}
                hash={result.hash}
                transactionId={result.transactionId}
                timestamp={result.timestamp}
                network={result.network}
                mirrorNodeUrl={result.mirrorNodeUrl}
                hashAlgorithm={result.hashAlgorithm}
                submittedBy={result.submittedBy}
                timestampIso={result.timestampIso}
                certificateId={result.certificateId}
                logoUrl={result.logoUrl}
              />

              {stampedPdfUrl && (
                <div className="mt-4">
                  <a
                    href={stampedPdfUrl}
                    download={`${fileName || "document"}_stamped.pdf`}
                    className="inline-block rounded bg-emerald-700 px-4 py-2 text-white text-sm hover:bg-emerald-800 transition"
                  >
                    ⬇ Download QR‑stamped PDF
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}