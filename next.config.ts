import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";

// Semua aset dilayani dari situs sendiri (font lewat next/font), jadi CSP cukup 'self'.
// 'unsafe-inline' dipakai skrip bawaan Next, 'unsafe-eval' hanya di dev.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const pribadi = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "private, no-store" },
];

const config: NextConfig = {
  poweredByHeader: false,
  // skema.sql dibaca saat aplikasi berjalan, jadi harus ikut terbawa ke server (misalnya di Vercel).
  images: {
    // Berkas fotonya HD (sisi terpanjang 1920 piksel). Yang dikirim ke pengunjung adalah ukuran yang pas untuk
    // layarnya, dalam AVIF atau WebP.
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
    // Hanya foto katalog bawaan dan foto unggahan yang boleh diolah.
    localPatterns: [
      { pathname: "/katalog/**", search: "" },
      { pathname: "/foto/**", search: "" },
    ],
    // Hasil olahan disimpan 31 hari. Kalau isi sebuah foto bawaan diganti, beri nama berkas baru.
    minimumCacheTTL: 2678400,
  },
  experimental: {
    // Foto HD dari halaman aset dikirim lewat aksi server, dan batas bawaan 1 MB tidak cukup. Angka ini harus di
    // atas MAKS_UKURAN_FOTO (src/lib/hitung.ts) dan di bawah batas 4,5 MB milik Vercel.
    serverActions: { bodySizeLimit: "3mb" },
  },
  outputFileTracingIncludes: { "/*": ["./db/skema.sql"], "/**": ["./db/skema.sql"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      ...(process.env.MODE_DEMO === "1" ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : []),
      { source: "/sistem/:path*", headers: pribadi },
      { source: "/cetak/:path*", headers: pribadi },
      { source: "/masuk", headers: pribadi },
    ];
  },
};

export default config;
