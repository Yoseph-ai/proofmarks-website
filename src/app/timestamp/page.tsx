"use client";
import React, { useCallback, useRef, useState, useEffect } from "react";
import DragDrop from "../../components/DragDrop";
import Certificate from "../../components/Certificate";
import QRCode from "qrcode"; // Added QR code here

interface TimestampResult {
  certificateId: string;
  transactionId: string;
  timestamp: string;
  network: string;
  mirrorNodeUrl: string;
  hashAlgorithm: string;
  submittedBy: string;
  timestampIso: string;
  logoUrl: string;
  hash: string;
}

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function TimestampPage() {
  const [loading, setLoading] = useState(false);
  const [hashing, setHashing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TimestampResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [stampedPdfUrl, setStampedPdfUrl] = useState<string | null>(null);
  const [stamping, setStamping] = useState(false);
  const fileBytesRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    return () => { if (stampedPdfUrl) URL.revokeObjectURL(stampedPdfUrl); };
  }, [stampedPdfUrl]);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    if (stampedPdfUrl) URL.revokeObjectURL(stampedPdfUrl);
    setStampedPdfUrl(null);
    setFileName(file.name);

    try {
      setHashing(true);
      const ab = await file.arrayBuffer();
      fileBytesRef.current = new Uint8Array(ab);
      const digest = await crypto.subtle.digest("SHA-256", ab);
      const hex = toHex(digest);
      setHashing(false);

      if (!/^[a-f0-9]{64}$/.test(hex)) throw new Error("Hash generation failed.");

      setLoading(true);
      const res = await fetch("/api/timestamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: hex }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) throw new Error(data?.error || "Server error");
      setResult({ ...data, hash: hex });

      const stampableTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!stampableTypes.includes(file.type)) return;

      setStamping(true);

      // FIX: Generate QR code here on the MAIN THREAD where the DOM/Canvas exists
      const verificationUrl = `${window.location.origin}/verify/${data.certificateId}`;
      const qrDataUrl = await QRCode.toDataURL(verificationUrl);

      const worker = new Worker(new URL("../workers/stamp.worker.ts", import.meta.url));
      
      worker.postMessage({
        fileBytes: fileBytesRef.current!,
        qrDataUrl, // Send the already generated image string
        mimeType: file.type,
      });

      worker.onmessage = (e) => {
        const workerData = e.data as any;
        const { success, bytes, mimeType, error: workerError } = workerData;
        if (success) {
          try {
            const blob = new Blob([bytes as any], { type: (mimeType as string) || "application/pdf" });
            setStampedPdfUrl(URL.createObjectURL(blob));
          } catch (blobErr) {
            setError("Failed to generate the stamped file.");
          }
        } else {
          setError(`Stamping failed: ${workerError}`);
        }
        setStamping(false);
        worker.terminate();
      };

      worker.onerror = () => {
        setError("A critical error occurred during stamping.");
        setStamping(false);
        worker.terminate();
      };
    } catch (err: any) {
      setHashing(false);
      setLoading(false);
      setStamping(false);
      setError(err?.message || "An unexpected error occurred");
    }
  }, [stampedPdfUrl]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-4">Submit & Timestamp a document</h2>
        <DragDrop onFile={onFile} maxSizeBytes={10 * 1024 * 1024} />
        <div className="mt-6">
          {hashing && <div className="flex items-center gap-3 text-sm text-gray-600"><div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" /> Computing SHA-256...</div>}
          {loading && <div className="text-sm text-gray-600 mt-3">Submitting to Hedera...</div>}
          {stamping && <div className="text-sm text-gray-600 mt-3">Stamping QR code (background thread)...</div>}
          {error && <div className="text-sm text-red-600 mt-3 font-medium">{error}</div>}
          {result && (
            <div className="mt-6">
              <Certificate {...result} fileName={fileName || "(unknown)"} />
              {stampedPdfUrl && (
                <div className="mt-4">
                  <a href={stampedPdfUrl} download={`${fileName?.split('.')[0] || "document"}_stamped.${fileName?.split('.').pop() || "pdf"}`} className="inline-block rounded bg-emerald-700 px-4 py-2 text-white text-sm hover:bg-emerald-800 transition">
                    ⬇ Download QR‑stamped File
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