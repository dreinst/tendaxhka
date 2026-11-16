import type { Metadata } from "next";
import { Bricolage_Grotesque, Unbounded } from "next/font/google";
import "./globals.css";

const judul = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", weight: ["500", "700"] });
const isi = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

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
          <p role="note" className="tanpa-cetak bg-lampu px-4 py-1.5 text-center text-xs font-semibold text-tinta">
            Versi demo. Semua data di sini contoh dan bisa kembali ke awal sewaktu-waktu. Jangan isi data asli.
          </p>
        )}
        {children}
      </body>
    </html>
  );
}
