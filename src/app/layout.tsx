import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const judul = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", weight: ["600", "700"] });
const isi = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: process.env.SITUS_URL ? new URL(process.env.SITUS_URL) : undefined,
  title: { default: "Tenda Indonesia, sewa tenda untuk acara", template: "%s | Tenda Indonesia" },
  description: "Sewa tenda dan perlengkapan acara, lengkap dengan tim pasang dan bongkar.",
  robots: process.env.MODE_DEMO === "1" ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${judul.variable} ${isi.variable}`}>
      <body className="min-h-screen antialiased">
        {process.env.MODE_DEMO === "1" && (
          <p role="note" className="tanpa-cetak bg-tinta-pekat px-4 py-1.5 text-center text-xs text-white/75">
            Versi demo dengan data contoh.<span className="max-sm:hidden"> Isinya bisa kembali ke awal sewaktu-waktu.</span> Jangan isi data asli.
          </p>
        )}
        {children}
      </body>
    </html>
  );
}
