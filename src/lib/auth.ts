import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Pengguna } from "./data.ts";
import { jalankan, satu } from "./db.ts";
import { boleh, type Hak } from "./hitung.ts";
import { hashToken, tokenBaru } from "./sandi.ts";

export const COOKIE_SESI = "sesi_tenda";
const UMUR_HARI = 14;

export const penggunaSaatIni = cache(async (): Promise<Pengguna | null> => {
  const token = (await cookies()).get(COOKIE_SESI)?.value;
  if (!token) return null;
  const u = satu<Pengguna>(
    `SELECT u.id, u.nama, u.username, u.peran, u.aktif FROM sesi s JOIN pengguna u ON u.id = s.pengguna_id
     WHERE s.token = ? AND s.kedaluwarsa > ? AND u.aktif = 1`,
    hashToken(token),
    new Date().toISOString(),
  );
  return u ?? null;
});

// Dipanggil di awal setiap halaman dan setiap aksi server. Menu hanya menyembunyikan tautan.
export async function wajib(hak?: Hak): Promise<Pengguna> {
  const u = await penggunaSaatIni();
  if (!u) redirect("/masuk");
  if (hak && !boleh(u.peran, hak)) redirect(`/sistem?galat=${encodeURIComponent("Akun ini tidak punya akses ke halaman itu.")}`);
  return u;
}

export async function bukaSesi(penggunaId: number): Promise<void> {
  const { token, hash } = tokenBaru();
  const kedaluwarsa = new Date(Date.now() + UMUR_HARI * 864e5);
  jalankan("DELETE FROM sesi WHERE kedaluwarsa <= ?", new Date().toISOString());
  jalankan("INSERT INTO sesi (token, pengguna_id, kedaluwarsa) VALUES (?, ?, ?)", hash, penggunaId, kedaluwarsa.toISOString());
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
  if (token) jalankan("DELETE FROM sesi WHERE token = ?", hashToken(token));
  jar.delete(COOKIE_SESI);
}

// Pembatas sederhana di memori proses. Cukup untuk sistem internal dengan satu server.
const catatan = new Map<string, number[]>();

export function terlaluSering(kunci: string, maks: number, jendelaMenit: number): boolean {
  const kini = Date.now();
  const baru = (catatan.get(kunci) ?? []).filter((t) => kini - t < jendelaMenit * 60_000);
  baru.push(kini);
  catatan.set(kunci, baru);
  return baru.length > maks;
}
