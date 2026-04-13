"use client";
import React, { useCallback, useRef, useState } from "react";

type Props = {
  onFile: (file: File) => void;
  maxSizeBytes?: number;
};

export default function DragDrop({ onFile, maxSizeBytes = 10 * 1024 * 1024 }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      setError(null);
      if (!files || files.length === 0) return;
      const file = files[0];
      if (file.size > maxSizeBytes) {
        setError(`File too large. Max ${(maxSizeBytes / 1024 / 1024).toFixed(0)} MB`);
        return;
      }
      onFile(file);
    },
    [onFile, maxSizeBytes]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          dragOver ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-lg font-medium">Drop a file here or click to select</div>
        <div className="text-sm text-gray-500 mt-2">Max file size: {(maxSizeBytes / 1024 / 1024).toFixed(0)} MB</div>
      </div>

      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
    </div>
  );
}
