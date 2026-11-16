import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Pengguna } from "./data.ts";
import { jalankan, MODE_DEMO, satu } from "./db.ts";
import { boleh, type Hak } from "./hitung.ts";
import { bacaSesiDemo, hashToken, tokenBaru, tokenSesiDemo } from "./sandi.ts";

export const COOKIE_SESI = "sesi_tenda";
const UMUR_HARI = 14;
// Sesi yang tidak dipakai selama ini dianggap habis, misalnya akun yang lupa keluar di perangkat orang lain.
const TIDAK_AKTIF_JAM = 12;
const TIDAK_AKTIF = TIDAK_AKTIF_JAM * 3600_000;

// Kunci tanda tangan sesi demo, diturunkan dari SANDI_DEMO supaya tidak perlu variabel tambahan.
function rahasiaDemo(): string {
  return createHash("sha256").update(`sesi-demo|${process.env.SANDI_DEMO ?? ""}`).digest("hex");
}

export const penggunaSaatIni = cache(async (): Promise<Pengguna | null> => {
  const token = (await cookies()).get(COOKIE_SESI)?.value;
  if (!token) return null;
  if (MODE_DEMO) {
    // Pengguna dicari lewat username karena data contoh di setiap server demo dibuat dengan urutan yang sama.
    const username = bacaSesiDemo(token, rahasiaDemo(), Date.now());
    if (!username) return null;
    return satu<Pengguna>("SELECT id, nama, username, peran, aktif FROM pengguna WHERE username = ? AND aktif = 1", username) ?? null;
  }
  const hash = hashToken(token);
  const kini = Date.now();
  const u = satu<Pengguna & { kedaluwarsa: string }>(
    `SELECT u.id, u.nama, u.username, u.peran, u.aktif, s.kedaluwarsa FROM sesi s JOIN pengguna u ON u.id = s.pengguna_id
     WHERE s.token = ? AND s.kedaluwarsa > ? AND (s.batas IS NULL OR s.batas > ?) AND u.aktif = 1`,
    hash,
    new Date(kini).toISOString(),
    new Date(kini).toISOString(),
  );
  if (!u) return null;
  // Geser batas tidak aktif ke depan, paling jauh sampai batas umur sesi. Supaya tidak menulis ke basis data
  // di setiap permintaan, penggeseran hanya dilakukan kalau sisa waktunya sudah berkurang lebih dari 5 menit.
  if (Date.parse(u.kedaluwarsa) - kini < TIDAK_AKTIF - 5 * 60_000) {
    jalankan(
      "UPDATE sesi SET batas = COALESCE(batas, kedaluwarsa), kedaluwarsa = MIN(?, COALESCE(batas, kedaluwarsa)) WHERE token = ?",
      new Date(kini + TIDAK_AKTIF).toISOString(),
      hash,
    );
  }
  return { id: u.id, nama: u.nama, username: u.username, peran: u.peran, aktif: u.aktif };
});

// Dipanggil di awal setiap halaman dan setiap aksi server. Menu hanya menyembunyikan tautan.
export async function wajib(hak?: Hak): Promise<Pengguna> {
  const u = await penggunaSaatIni();
  if (!u) redirect("/masuk");
  if (hak && !boleh(u.peran, hak)) redirect(`/sistem?galat=${encodeURIComponent("Akun ini tidak punya akses ke halaman itu.")}`);
  return u;
}

export async function bukaSesi(penggunaId: number): Promise<void> {
  if (MODE_DEMO) {
    const u = satu<{ username: string }>("SELECT username FROM pengguna WHERE id = ?", penggunaId);
    if (!u) return;
    const habis = Date.now() + TIDAK_AKTIF;
    (await cookies()).set(COOKIE_SESI, tokenSesiDemo(u.username, habis, rahasiaDemo()), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(habis),
    });
    return;
  }
  const { token, hash } = tokenBaru();
  const kedaluwarsa = new Date(Date.now() + UMUR_HARI * 864e5);
  jalankan("DELETE FROM sesi WHERE kedaluwarsa <= ? OR batas <= ?", new Date().toISOString(), new Date().toISOString());
  jalankan(
    "INSERT INTO sesi (token, pengguna_id, kedaluwarsa, batas) VALUES (?, ?, ?, ?)",
    hash,
    penggunaId,
    new Date(Date.now() + TIDAK_AKTIF).toISOString(),
    kedaluwarsa.toISOString(),
  );
  (await cookies()).set(COOKIE_SESI, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: kedaluwarsa,
  });
}

export async function tutupSesi(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESI)?.value;
  if (token && !MODE_DEMO) jalankan("DELETE FROM sesi WHERE token = ?", hashToken(token));
  jar.delete(COOKIE_SESI);
}

// Pembatas sederhana di memori proses. Cukup untuk sistem internal dengan satu server.
const catatan = new Map<string, number[]>();
const JENDELA_TERLAMA = 60 * 60_000;

export function terlaluSering(kunci: string, maks: number, jendelaMenit: number): boolean {
  const kini = Date.now();
  // Kunci lama dibuang supaya peta ini tidak terus membesar kalau dibanjiri kunci acak.
  if (catatan.size > 5000) {
    for (const [k, daftar] of catatan) if (kini - daftar[daftar.length - 1] > JENDELA_TERLAMA) catatan.delete(k);
  }
  const baru = (catatan.get(kunci) ?? []).filter((t) => kini - t < jendelaMenit * 60_000);
  baru.push(kini);
  catatan.set(kunci, baru);
  return baru.length > maks;
}

// Alamat IP pengunjung. Header seperti x-forwarded-for bisa diisi bebas oleh pengirim, jadi hanya dipercaya
// kalau HEADER_IP di .env menunjuk header yang ditulis ulang oleh proxy sendiri (misalnya x-real-ip dari
// Nginx atau cf-connecting-ip dari Cloudflare). Tanpa itu, semua pengunjung dianggap satu alamat.
export async function alamatIp(): Promise<string> {
  const nama = process.env.HEADER_IP?.trim().toLowerCase();
  if (!nama) return "tanpa-ip";
  return (await headers()).get(nama)?.split(",")[0].trim().slice(0, 64) || "tanpa-ip";
}
