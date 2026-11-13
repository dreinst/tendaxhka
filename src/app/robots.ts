import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/sistem", "/cetak", "/masuk"] },
    sitemap: process.env.SITUS_URL ? `${process.env.SITUS_URL}/sitemap.xml` : undefined,
  };
}
