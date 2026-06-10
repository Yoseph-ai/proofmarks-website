import React from 'react';
import "../styles/globals.css";
import Header from "../components/Header";

export const metadata = {
  title: "Proofmarks — Timestamp & Verify Documents on Hedera",
  description:
    "Proofmarks anchors SHA-256 document hashes to the Hedera blockchain. Zero-touch. Real-time. Independently verifiable by anyone.",
  openGraph: {
    title: "Proofmarks — Timestamp & Verify Documents on Hedera",
    description:
      "Sovereign, cryptographic document verification. No blockchain experience required.",
    url: "https://app.proofmarks.cloud",
    siteName: "Proofmarks",
    type: "website",
  },
  // themeColor moved to viewport below
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1D9E75",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-slate-900 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}