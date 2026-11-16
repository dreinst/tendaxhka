import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

// Satu koneksi per proses, disimpan di globalThis supaya tidak dibuka ulang saat dev memuat ulang modul.
type Wadah = typeof globalThis & { __dbTenda?: DatabaseSync };

export function db(): DatabaseSync {
  const g = globalThis as Wadah;
  if (!g.__dbTenda) {
    const jalur = process.env.DB_PATH ?? join(process.cwd(), "data", "tenda.db");
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
