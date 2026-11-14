import type { MetadataRoute } from "next";

// Halaman sistem tidak dicantumkan di sini karena robots.txt bisa dibaca siapa saja. Header X-Robots-Tag
// noindex di next.config.ts sudah mencegah /sistem, /cetak, dan /masuk masuk ke mesin pencari.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: process.env.SITUS_URL ? `${process.env.SITUS_URL}/sitemap.xml` : undefined,
  };
}
