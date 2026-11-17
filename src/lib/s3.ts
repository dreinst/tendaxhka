import { createHash, createHmac } from "node:crypto";

// Tanda tangan AWS Signature Version 4 untuk satu permintaan ke penyimpanan yang kompatibel dengan S3
// (Cloudflare R2). Ditulis sendiri karena yang dibutuhkan hanya tiga permintaan sederhana (PUT, GET, DELETE
// satu objek), jadi tidak perlu membawa SDK S3. Ujinya memakai contoh hitungan dari dokumentasi AWS.

const hash = (isi: string | Uint8Array) => createHash("sha256").update(isi).digest("hex");
const hmac = (kunci: string | Buffer, isi: string) => createHmac("sha256", kunci).update(isi).digest();

// Setiap ruas jalur di-encode menurut RFC 3986. encodeURIComponent membiarkan ! ' ( ) *, jadi ditambahkan.
function jalurKanonik(jalur: string): string {
  return jalur
    .split("/")
    .map((ruas) => encodeURIComponent(decodeURIComponent(ruas)).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");
}

export type PermintaanS3 = {
  method: string;
  url: string;
  // Header tambahan yang ikut dikirim dan ditandatangani, misalnya content-type.
  kepala?: Record<string, string>;
  // SHA-256 isi permintaan dalam heksadesimal. Untuk permintaan tanpa isi, hash dari teks kosong.
  hashIsi: string;
  kunci: string;
  rahasia: string;
  wilayah: string;
  waktu?: Date;
};

export const HASH_KOSONG = hash("");
export const hashIsi = (isi: Uint8Array): string => hash(isi);

// Mengembalikan semua header yang harus dikirim, termasuk Authorization. Header host tidak ikut dikembalikan
// karena fetch mengisinya sendiri dari alamat.
export function tandaTanganS3(p: PermintaanS3): Record<string, string> {
  const alamat = new URL(p.url);
  const tanggal = (p.waktu ?? new Date()).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const hari = tanggal.slice(0, 8);
  const kepala: Record<string, string> = { "x-amz-content-sha256": p.hashIsi, "x-amz-date": tanggal };
  for (const [nama, nilai] of Object.entries(p.kepala ?? {})) kepala[nama.toLowerCase()] = nilai.trim().replace(/\s+/g, " ");
  const ditandatangani: Record<string, string> = { ...kepala, host: alamat.host };
  const nama = Object.keys(ditandatangani).sort();
  const kueri = [...alamat.searchParams]
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .sort()
    .join("&");
  const permintaan = [
    p.method,
    jalurKanonik(alamat.pathname),
    kueri,
    ...nama.map((n) => `${n}:${ditandatangani[n]}`),
    "",
    nama.join(";"),
    p.hashIsi,
  ].join("\n");
  const lingkup = `${hari}/${p.wilayah}/s3/aws4_request`;
  const teks = ["AWS4-HMAC-SHA256", tanggal, lingkup, hash(permintaan)].join("\n");
  const kunciTanda = hmac(hmac(hmac(hmac(`AWS4${p.rahasia}`, hari), p.wilayah), "s3"), "aws4_request");
  const tanda = createHmac("sha256", kunciTanda).update(teks).digest("hex");
  return { ...kepala, authorization: `AWS4-HMAC-SHA256 Credential=${p.kunci}/${lingkup}, SignedHeaders=${nama.join(";")}, Signature=${tanda}` };
}
