"use client";
import React, { useCallback, useRef, useState, useEffect } from "react";
import DragDrop from "../../components/DragDrop";
import Certificate from "../../components/Certificate";
import QRCode from "qrcode";

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
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const fileBytesRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    return () => { if (certificateUrl) URL.revokeObjectURL(certificateUrl); };
  }, [certificateUrl]);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    if (certificateUrl) URL.revokeObjectURL(certificateUrl);
    setCertificateUrl(null);
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
      
      const finalResult: TimestampResult = { ...data, hash: hex };
      setResult(finalResult);

      // --- GENERATE CERTIFICATE PDF ---
      setGenerating(true);
      const verificationUrl = `${window.location.origin}/verify/${data.certificateId}`;
      const qrDataUrl = await QRCode.toDataURL(verificationUrl);

      // Use the NEW certificate worker
      const worker = new Worker(new URL("../workers/certificate.worker.ts", import.meta.url));
      
      worker.postMessage({
        certificateData: {
          fileName: file.name,
          hash: hex,
          timestamp: data.timestamp,
          certificateId: data.certificateId,
          sequence: data.sequence || "N/A",
          network: data.network,
          algorithm: "SHA-256",
          mirrorNodeUrl: data.mirrorNodeUrl,
        },
        qrDataUrl,
        logoUrl: data.logoUrl || "", 
      });

      worker.onmessage = (e) => {
        const workerData = e.data as any;
        const { success, bytes, mimeType, error: workerError } = workerData;
        if (success) {
          try {
            const blob = new Blob([bytes as any], { type: (mimeType as string) || "application/pdf" });
            setCertificateUrl(URL.createObjectURL(blob));
          } catch (blobErr) {
            setError("Failed to generate the certificate PDF.");
          }
        } else {
          setError(`Certificate generation failed: ${workerError}`);
        }
        setGenerating(false);
        worker.terminate();
      };

      worker.onerror = () => {
        setError("A critical error occurred during PDF generation.");
        setGenerating(false);
        worker.terminate();
      };
    } catch (err: any) {
      setHashing(false);
      setLoading(false);
      setGenerating(false);
      setError(err?.message || "An unexpected error occurred");
    }
  }, [certificateUrl]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-4">Submit & Timestamp a document</h2>
        <DragDrop onFile={onFile} maxSizeBytes={10 * 1024 * 1024} />
        <div className="mt-6">
          {hashing && <div className="flex items-center gap-3 text-sm text-gray-600"><div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" /> Computing SHA-256...</div>}
          {loading && <div className="text-sm text-gray-600 mt-3">Submitting to Hedera...</div>}
          {generating && <div className="text-sm text-gray-600 mt-3">Creating official Certificate of Authenticity...</div>}
          {error && <div className="text-sm text-red-600 mt-3 font-medium">{error}</div>}
          {result && (
            <div className="mt-6">
              <Certificate {...result} fileName={fileName || "(unknown)"} />
              {certificateUrl && (
                <div className="mt-4">
                  <a href={certificateUrl} download={`Certificate_${fileName?.split('.')[0] || "document"}.pdf`} className="inline-block rounded bg-emerald-700 px-4 py-2 text-white text-sm hover:bg-emerald-800 transition">
                    ⬇ Download Official Certificate
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