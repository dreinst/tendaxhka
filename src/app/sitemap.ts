import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return process.env.SITUS_URL ? [
        { url: process.env.SITUS_URL, changeFrequency: "weekly", priority: 1 },
        { url: `${process.env.SITUS_URL}/produk`, changeFrequency: "weekly", priority: 0.8 },
      ] : [];
}
