import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-20 text-center">
      <h1 className="text-4xl font-extrabold mb-4">
        Lock any document in time.
      </h1>
      <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto">
        Upload any file — a contract, a photo, a report. Get a tamper-proof
        certificate proving exactly when it existed. Permanently recorded.
        Verifiable by anyone.
      </p>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <Link
          href="/timestamp"
          className="w-full sm:w-56 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow text-center transition"
        >
          Timestamp a document
        </Link>
        <Link
          href="/verify"
          className="w-full sm:w-56 py-4 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-semibold shadow text-center transition"
        >
          Verify a certificate
        </Link>
      </div>
    </main>
  );
}