import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { namaFotoSah } from "./hitung.ts";

// Foto disimpan sebagai berkas di samping basis data (data/foto), atau di FOTO_DIR kalau diisi.
// Folder ini perlu ikut dicadangkan bersama berkas basis datanya.
export function folderFoto(): string {
  if (process.env.FOTO_DIR) return process.env.FOTO_DIR;
  const db = process.env.DB_PATH;
  return join(db && db !== ":memory:" ? dirname(db) : join(process.cwd(), "data"), "foto");
}

export function simpanBerkasFoto(isi: Uint8Array): string {
  const nama = `${randomBytes(16).toString("hex")}.jpg`;
  mkdirSync(folderFoto(), { recursive: true });
  writeFileSync(join(folderFoto(), nama), isi, { flag: "wx" });
  return nama;
}

export function bacaBerkasFoto(nama: string): Buffer | null {
  if (!namaFotoSah(nama)) return null;
  try {
    return readFileSync(join(folderFoto(), nama));
  } catch {
    return null;
  }
}

export function hapusBerkasFoto(nama: string): void {
  if (namaFotoSah(nama)) rmSync(join(folderFoto(), nama), { force: true });
}
