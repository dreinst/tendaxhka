import { bacaBerkasFoto } from "@/lib/foto";

// Foto katalog bersifat publik karena tampil di website. Nama berkasnya acak dan tidak pernah dipakai ulang,
// jadi boleh disimpan lama di cache browser dan CDN. CDN Vercel hanya menyimpan jawaban fungsi kalau ada
// s-maxage, jadi tanpa itu setiap foto diambil ulang dari R2 atau disk.
export async function GET(_req: Request, { params }: { params: Promise<{ nama: string }> }) {
  const isi = await bacaBerkasFoto((await params).nama);
  if (!isi) return new Response("Tidak ditemukan", { status: 404 });
  return new Response(new Uint8Array(isi), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(isi.length),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
