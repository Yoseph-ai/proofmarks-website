import Header from "../components/Header";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-extrabold mb-4">Hedera Document Notary</h1>
        <p className="text-lg text-gray-600 mb-8">Immutable proof of existence for any file.</p>

        <div className="flex justify-center gap-6">
          <Link href="/timestamp" className="px-6 py-4 bg-emerald-600 text-white rounded-lg font-semibold shadow">
            Timestamp a document
          </Link>

          <Link href="/verify" className="px-6 py-4 bg-slate-700 text-white rounded-lg font-semibold shadow">
            Verify a document
          </Link>
        </div>
      </main>
    </div>
  );
}
