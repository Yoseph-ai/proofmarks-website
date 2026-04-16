import "../styles/globals.css";
import Header from "../components/Header";

export const metadata = {
  title: "Hedera Trust Anchor",
  description: "Immutable proof for digital assets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-slate-900">
        <Header />
        {children}
      </body>
    </html>
  );
}