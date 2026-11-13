import type { Metadata } from "next";
import { Bricolage_Grotesque, Unbounded } from "next/font/google";
import "./globals.css";

const judul = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", weight: ["500", "700"] });
const isi = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const metadata: Metadata = {
  metadataBase: process.env.SITUS_URL ? new URL(process.env.SITUS_URL) : undefined,
  title: { default: "Tenda Indonesia, sewa tenda untuk acara", template: "%s | Tenda Indonesia" },
  description: "Sewa tenda dan perlengkapan acara, lengkap dengan tim pasang dan bongkar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${judul.variable} ${isi.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
