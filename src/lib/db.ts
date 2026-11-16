import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { isiDataContoh } from "./contoh.ts";

// Satu koneksi per proses, disimpan di globalThis supaya tidak dibuka ulang saat dev memuat ulang modul.
type Wadah = typeof globalThis & { __dbTenda?: DatabaseSync };

// Mode demo untuk hosting tanpa disk tetap seperti Vercel: basis data dan foto ditaruh di /tmp, satu-satunya
// folder yang boleh ditulis di sana, lalu diisi data contoh saat masih kosong. Isinya hilang setiap kali
// server dimulai ulang, jadi mode ini hanya untuk pratinjau, tidak untuk data asli.
export const MODE_DEMO = process.env.MODE_DEMO === "1";

export function jalurDb(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  return MODE_DEMO ? "/tmp/tenda-demo/tenda.db" : join(process.cwd(), "data", "tenda.db");
}

export function db(): DatabaseSync {
  const g = globalThis as Wadah;
  if (!g.__dbTenda) {
    const jalur = jalurDb();
    if (jalur !== ":memory:") mkdirSync(dirname(jalur), { recursive: true });
    const d = new DatabaseSync(jalur);
    d.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    d.exec(readFileSync(join(process.cwd(), "db", "skema.sql"), "utf8"));
    // Kolom yang ditambahkan sesudah skema awal. ALTER TABLE tidak punya IF NOT EXISTS, jadi dicek dulu.
    const punya = (tabel: string, kolom: string) =>
      (d.prepare(`PRAGMA table_info(${tabel})`).all() as { name: string }[]).some((k) => k.name === kolom);
    if (!punya("sesi", "batas")) d.exec("ALTER TABLE sesi ADD COLUMN batas TEXT");
    if (!punya("aset", "kapasitas")) d.exec("ALTER TABLE aset ADD COLUMN kapasitas TEXT NOT NULL DEFAULT ''");
    if (!punya("aset", "cocok")) d.exec("ALTER TABLE aset ADD COLUMN cocok TEXT NOT NULL DEFAULT ''");
    // Koneksi baru disimpan di globalThis hanya sesudah data contoh berhasil diisi. Kalau diisi lebih dulu dan
    // pengisiannya gagal, pemanggilan berikutnya memakai basis data kosong tanpa pengguna.
    if (MODE_DEMO) {
      try {
        if (!d.prepare("SELECT 1 FROM pengguna LIMIT 1").get()) {
          const sandi = process.env.SANDI_DEMO ?? "";
          if (sandi.length < 8) throw new Error("MODE_DEMO=1 butuh SANDI_DEMO minimal 8 karakter untuk akun contoh.");
          g.__dbTenda = d;
          isiDataContoh(sandi);
        }
      } catch (e) {
        g.__dbTenda = undefined;
        d.close();
        throw e;
      }
    }
    g.__dbTenda = d;
  }
  return g.__dbTenda;
}

type P = SQLInputValue;

export function semua<T>(sql: string, ...p: P[]): T[] {
  return db().prepare(sql).all(...p) as T[];
}

export function satu<T>(sql: string, ...p: P[]): T | undefined {
  return db().prepare(sql).get(...p) as T | undefined;
}

export function jalankan(sql: string, ...p: P[]): number {
  return Number(db().prepare(sql).run(...p).lastInsertRowid);
}

// BEGIN IMMEDIATE mengambil kunci tulis sejak awal, jadi dua booking yang berebut aset diproses bergantian.
export function transaksi<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const hasil = fn();
    d.exec("COMMIT");
    return hasil;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
