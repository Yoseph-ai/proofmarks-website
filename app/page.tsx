import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Proofmarks</h1>
      <p className="text-xl mb-8">Verify and timestamp documents on Hedera.</p>
      <Link href="/get-key" className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700">
        Get an API Key
      </Link>
    </main>
  );
}
