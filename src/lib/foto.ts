import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { jalurDb } from "./db.ts";
import { namaFotoSah } from "./hitung.ts";
import { HASH_KOSONG, hashIsi, tandaTanganS3 } from "./s3.ts";

// Foto katalog disimpan di salah satu dari tiga tempat:
//  - Vercel Blob, kalau proyek Vercel-nya disambungkan ke satu Blob store privat (Vercel mengisi
//    BLOB_READ_WRITE_TOKEN atau BLOB_STORE_ID sendiri). Paling sederhana di Vercel karena tanpa akun lain.
//  - Cloudflare R2, kalau keempat variabel R2_* diisi. Kuota gratisnya lebih besar. Kalau dua-duanya terisi,
//    R2 yang dipakai.
//  - folder di disk: data/foto di samping berkas basis data, atau FOTO_DIR. Folder ini perlu ikut dicadangkan.
// Basis data hanya menyimpan nama berkasnya, dan foto selalu dilayani lewat /foto/<nama>. Jadi tempat simpan
// bisa diganti tanpa mengubah alamat foto, dan penyimpanannya tidak perlu dibuka untuk umum. Mode demo
// memakai tempat yang sama dengan mode biasa: yang menentukan hanya variabel yang diisi.

const VARIABEL_R2 = ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const;

type TempatR2 = { pangkal: string; kunci: string; rahasia: string };

// R2_ENDPOINT adalah alamat API S3 akun Cloudflare, bentuknya https://<id akun>.r2.cloudflarestorage.com.
function r2(): TempatR2 | null {
  const terisi = VARIABEL_R2.filter((v) => process.env[v]?.trim());
  if (terisi.length === 0) return null;
  if (terisi.length < VARIABEL_R2.length) {
    throw new Error(`Pengaturan R2 belum lengkap. Yang masih kosong: ${VARIABEL_R2.filter((v) => !terisi.includes(v)).join(", ")}.`);
  }
  const e = process.env as unknown as Record<(typeof VARIABEL_R2)[number], string>;
  return {
    pangkal: `${e.R2_ENDPOINT.trim().replace(/\/+$/, "")}/${e.R2_BUCKET.trim()}/foto`,
    kunci: e.R2_ACCESS_KEY_ID.trim(),
    rahasia: e.R2_SECRET_ACCESS_KEY.trim(),
  };
}

function mintaR2(t: TempatR2, method: "GET" | "PUT" | "DELETE", nama: string, isi?: Uint8Array): Promise<Response> {
  const url = `${t.pangkal}/${nama}`;
  const kepala = tandaTanganS3({
    method,
    url,
    kepala: isi ? { "content-type": "image/jpeg" } : {},
    hashIsi: isi ? hashIsi(isi) : HASH_KOSONG,
    kunci: t.kunci,
    rahasia: t.rahasia,
    // R2 hanya punya satu wilayah tanda tangan.
    wilayah: "auto",
  });
  return fetch(url, { method, headers: kepala, body: isi ? Buffer.from(isi) : undefined, signal: AbortSignal.timeout(15_000) });
}

function pakaiBlob(): boolean {
  return !!(process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim());
}

const jalurBlob = (nama: string) => `foto/${nama}`;

export function folderFoto(): string {
  if (process.env.FOTO_DIR) return process.env.FOTO_DIR;
  const db = jalurDb();
  return join(db !== ":memory:" ? dirname(db) : join(process.cwd(), "data"), "foto");
}

// Menyimpan satu foto JPEG dan mengembalikan nama berkasnya. Namanya acak dan tidak pernah dipakai ulang.
export async function simpanBerkasFoto(isi: Uint8Array): Promise<string> {
  const nama = `${randomBytes(16).toString("hex")}.jpg`;
  const t = r2();
  if (t) {
    const jawab = await mintaR2(t, "PUT", nama, isi);
    if (!jawab.ok) throw new Error(`R2 menolak unggahan foto (status ${jawab.status}).`);
    return nama;
  }
  if (pakaiBlob()) {
    const { put } = await import("@vercel/blob");
    await put(jalurBlob(nama), Buffer.from(isi), { access: "private", contentType: "image/jpeg", addRandomSuffix: false });
    return nama;
  }
  await mkdir(folderFoto(), { recursive: true });
  await writeFile(join(folderFoto(), nama), isi, { flag: "wx" });
  return nama;
}

export async function bacaBerkasFoto(nama: string): Promise<Uint8Array | null> {
  if (!namaFotoSah(nama)) return null;
  const t = r2();
  if (t) {
    const jawab = await mintaR2(t, "GET", nama);
    if (jawab.status === 404) return null;
    if (!jawab.ok) throw new Error(`R2 gagal memberikan foto (status ${jawab.status}).`);
    return new Uint8Array(await jawab.arrayBuffer());
  }
  if (pakaiBlob()) {
    const { get } = await import("@vercel/blob");
    const hasil = await get(jalurBlob(nama), { access: "private" });
    if (!hasil || hasil.statusCode !== 200 || !hasil.stream) return null;
    return new Uint8Array(await new Response(hasil.stream).arrayBuffer());
  }
  return readFile(join(folderFoto(), nama)).catch(() => null);
}

// Berkas yang gagal dihapus tidak menggagalkan aksinya: barisnya di basis data sudah hilang, jadi foto itu
// tidak tampil lagi di mana pun. Yang tersisa hanya berkas yatim, dan itu dicatat di log server.
export async function hapusBerkasFoto(nama: string): Promise<void> {
  if (!namaFotoSah(nama)) return;
  try {
    const t = r2();
    if (t) {
      const jawab = await mintaR2(t, "DELETE", nama);
      if (!jawab.ok && jawab.status !== 404) throw new Error(`status ${jawab.status}`);
      return;
    }
    if (pakaiBlob()) {
      const { del } = await import("@vercel/blob");
      await del(jalurBlob(nama));
      return;
    }
    await rm(join(folderFoto(), nama), { force: true });
  } catch (e) {
    console.error(`Berkas foto ${nama} gagal dihapus:`, e);
  }
}
