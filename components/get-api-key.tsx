"use client";

import { useState } from "react";

export default function GetApiKey() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("https://hedera-document-auth.vercel.app/api/keys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate key");
      }

      setApiKey(data.apiKey);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (apiKey) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm w-full max-w-md">
        <h3 className="text-lg font-semibold text-green-900">Your API Key is Ready!</h3>
        <p className="mt-1 text-sm text-green-700">
          Copy this key and store it securely. <strong>You will not be able to see it again.</strong>
        </p>
        
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-300 bg-white p-3">
          <code className="flex-1 overflow-x-auto text-sm text-gray-800">{apiKey}</code>
          <button
            onClick={copyToClipboard}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Get your free API key</h3>
      <p className="mb-6 mt-1 text-sm text-gray-500">
        Start anchoring and verifying documents today. No credit card required.
      </p>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name or Company</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="Acme Corp"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Work Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="you@company.com"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-green-300"
        >
          {loading ? "Generating..." : "Generate API Key"}
        </button>
      </form>
    </div>
  );
}
