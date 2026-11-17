import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Client, InValue, ResultSet, Transaction } from "@libsql/client";
import { isiDataContoh } from "./contoh.ts";

// Mode demo untuk pratinjau tanpa basis data sungguhan: berkas SQLite dan foto ditaruh di /tmp, satu-satunya
// folder yang boleh ditulis di hosting seperti Vercel, lalu diisi data contoh saat masih kosong. Isinya hilang
// setiap kali server dimulai ulang, jadi mode ini tidak untuk data asli.
export const MODE_DEMO = process.env.MODE_DEMO === "1";

// Basis data ada di salah satu dari dua tempat, dan kode di luar berkas ini tidak perlu tahu yang mana:
//  - TURSO_DATABASE_URL diisi: basis data Turso (libSQL lewat jaringan). Dipakai di hosting tanpa disk tetap
//    seperti Vercel. TURSO_AUTH_TOKEN berisi token aksesnya.
//  - selain itu: satu berkas SQLite di DB_PATH, bawaannya data/tenda.db (atau /tmp di mode demo).
// Keduanya dibuka lewat klien libSQL yang sama, jadi SQL dan skemanya tidak berbeda.
const ALAMAT_JAUH = process.env.TURSO_DATABASE_URL?.trim() || "";

export function jalurDb(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  return MODE_DEMO ? "/tmp/tenda-demo/tenda.db" : join(process.cwd(), "data", "tenda.db");
}

// Naikkan angka ini setiap kali db/skema.sql atau KOLOM_TAMBAHAN berubah. Basis data jarak jauh hanya dipasangi
// skema lagi kalau versinya tertinggal.
const VERSI_SKEMA = 1;

// Kolom yang ditambahkan sesudah skema awal. ALTER TABLE tidak punya IF NOT EXISTS, jadi galat "kolom sudah
// ada" diabaikan.
const KOLOM_TAMBAHAN: [tabel: string, kolom: string, tipe: string][] = [
  ["sesi", "batas", "TEXT"],
  ["aset", "kapasitas", "TEXT NOT NULL DEFAULT ''"],
  ["aset", "cocok", "TEXT NOT NULL DEFAULT ''"],
];

type Keadaan = {
  klien?: Promise<Client>;
  // Transaksi yang sedang berjalan di rantai pemanggilan ini. semua(), satu(), dan jalankan() yang dipanggil
  // di dalam transaksi() otomatis memakainya, jadi pemanggil tidak perlu mengoper objek transaksi ke mana-mana.
  transaksi: AsyncLocalStorage<Transaction>;
  // Ekor antrean untuk berkas lokal (lihat antre).
  ekor: Promise<unknown>;
};

// Disimpan di globalThis supaya koneksi tidak dibuka ulang saat dev memuat ulang modul.
function keadaan(): Keadaan {
  const g = globalThis as typeof globalThis & { __dbTenda?: Keadaan };
  g.__dbTenda ??= { transaksi: new AsyncLocalStorage<Transaction>(), ekor: Promise.resolve() };
  return g.__dbTenda;
}

// Klien basis data, dibuka dan disiapkan sekali per proses. Kalau penyiapannya gagal (misalnya SANDI_DEMO belum
// diisi), pemanggilan berikutnya mencoba lagi dari awal dan tidak memakai basis data setengah jadi.
export function buka(): Promise<Client> {
  const k = keadaan();
  if (k.klien) return k.klien;
  const baru = siapkan();
  k.klien = baru;
  baru.catch(() => {
    if (k.klien === baru) k.klien = undefined;
  });
  return baru;
}

// Menutup koneksi. Dipakai uji dan skrip supaya proses bisa selesai.
export async function tutup(): Promise<void> {
  const k = keadaan();
  const lama = k.klien;
  k.klien = undefined;
  if (lama) (await lama.catch(() => null))?.close();
}

async function siapkan(): Promise<Client> {
  if (ALAMAT_JAUH && MODE_DEMO) {
    throw new Error("MODE_DEMO=1 tidak boleh dipakai bersama TURSO_DATABASE_URL, karena data contoh bisa masuk ke basis data asli.");
  }
  const klien = await buatKlien();
  try {
    // WAL membuat pembaca tidak tertahan penulis. Turso mengatur jurnalnya sendiri dan menolak PRAGMA ini.
    if (!ALAMAT_JAUH) await klien.execute("PRAGMA journal_mode = WAL");
    await pasangSkema(klien);
    if (MODE_DEMO) await isiContohBilaKosong(klien);
    return klien;
  } catch (e) {
    klien.close();
    throw e;
  }
}

async function buatKlien(): Promise<Client> {
  // Basis data jarak jauh dibuka dengan klien web: cukup fetch, tanpa modul native, dan itu yang disarankan
  // Turso untuk Vercel. Alamat libsql:// dilayani lewat HTTPS.
  if (ALAMAT_JAUH && !ALAMAT_JAUH.startsWith("file:")) {
    const { createClient } = await import("@libsql/client/web");
    return createClient({ url: ALAMAT_JAUH, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  // Berkas lokal butuh klien Node, yang membawa SQLite sendiri.
  const { createClient } = await import("@libsql/client");
  // Alamat file: di TURSO_DATABASE_URL hanya dipakai uji, untuk menjalankan cabang kode jarak jauh tanpa server.
  if (ALAMAT_JAUH) return createClient({ url: ALAMAT_JAUH });
  const jalur = jalurDb();
  if (jalur !== ":memory:") mkdirSync(dirname(jalur), { recursive: true });
  // timeout: lama menunggu kunci kalau berkasnya sedang ditulis proses lain, misalnya skrip seed.
  return createClient({ url: jalur === ":memory:" ? ":memory:" : `file:${jalur}`, timeout: 5000 });
}

// Berkas lokal dipasangi skema setiap kali dibuka: murah, dan perubahan skema langsung berlaku. Basis data
// jarak jauh dicek versinya dulu dengan satu kueri, supaya server yang baru bangun tidak mengirim seluruh skema.
async function pasangSkema(klien: Client): Promise<void> {
  if (ALAMAT_JAUH) {
    const versi = await klien.execute("SELECT nilai FROM pengaturan WHERE kunci = 'versi_skema'").then(
      (r) => Number(r.rows[0]?.nilai ?? 0),
      // Tabel pengaturan belum ada berarti basis datanya masih kosong. Galat lain (jaringan, token) akan muncul
      // lagi saat skema dipasang di bawah.
      () => 0,
    );
    if (versi >= VERSI_SKEMA) return;
  }
  await klien.executeMultiple(readFileSync(join(process.cwd(), "db", "skema.sql"), "utf8"));
  for (const [tabel, kolom, tipe] of KOLOM_TAMBAHAN) {
    await klien.execute(`ALTER TABLE ${tabel} ADD COLUMN ${kolom} ${tipe}`).catch((e: unknown) => {
      if (!/duplicate column/i.test(String((e as Error)?.message))) throw e;
    });
  }
  await klien.execute({
    sql: "INSERT INTO pengaturan (kunci, nilai) VALUES ('versi_skema', ?) ON CONFLICT (kunci) DO UPDATE SET nilai = excluded.nilai",
    args: [String(VERSI_SKEMA)],
  });
}

// Data contoh diisi di dalam satu transaksi: kalau gagal di tengah, tidak ada yang tersimpan dan pemanggilan
// berikutnya mengulang dari basis data kosong.
async function isiContohBilaKosong(klien: Client): Promise<void> {
  if ((await klien.execute("SELECT 1 FROM pengguna LIMIT 1")).rows.length) return;
  const sandi = process.env.SANDI_DEMO ?? "";
  if (sandi.length < 8) throw new Error("MODE_DEMO=1 butuh SANDI_DEMO minimal 8 karakter untuk akun contoh.");
  await dalamTransaksi(klien, () => isiDataContoh(sandi));
}

// Berkas lokal hanya menerima satu penulis. Koneksi lain yang ikut menulis saat sebuah transaksi masih terbuka
// langsung ditolak (SQLITE_BUSY), dan karena semuanya jalan di satu proses, menunggu kunci tidak membantu.
// Jadi untuk berkas lokal setiap pernyataan dan setiap transaksi diantrekan satu per satu. Basis data jarak
// jauh mengatur gilirannya sendiri di server, jadi tidak diantrekan.
function antre<T>(fn: () => Promise<T>): Promise<T> {
  if (ALAMAT_JAUH) return fn();
  const k = keadaan();
  const hasil = k.ekor.then(fn, fn);
  k.ekor = hasil.then(
    () => undefined,
    () => undefined,
  );
  return hasil;
}

async function dalamTransaksi<T>(klien: Client, fn: () => Promise<T> | T): Promise<T> {
  // Mode "write" memulai dengan BEGIN IMMEDIATE: kunci tulis diambil sejak awal, jadi dua booking yang berebut
  // aset diproses bergantian. Di Turso transaksi seperti ini harus selesai dalam 5 detik.
  const tx = await klien.transaction("write");
  try {
    const hasil = await keadaan().transaksi.run(tx, fn);
    await tx.commit();
    return hasil;
  } catch (e) {
    // Transaksi bisa saja sudah ditutup server (misalnya kena batas waktu), jadi galat rollback diabaikan.
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

type P = InValue;

async function eksekusi(sql: string, args: P[]): Promise<ResultSet> {
  const tx = keadaan().transaksi.getStore();
  if (tx) return tx.execute({ sql, args });
  const klien = await buka();
  return antre(() => klien.execute({ sql, args }));
}

// Baris dari klien membawa indeks tersembunyi selain nama kolom. Disalin menjadi objek biasa supaya aman dioper
// ke komponen klien dan dibandingkan di uji.
function polos<T>(baris: unknown): T {
  return { ...(baris as object) } as T;
}

export async function semua<T>(sql: string, ...p: P[]): Promise<T[]> {
  return (await eksekusi(sql, p)).rows.map((b) => polos<T>(b));
}

export async function satu<T>(sql: string, ...p: P[]): Promise<T | undefined> {
  const baris = (await eksekusi(sql, p)).rows[0];
  return baris === undefined ? undefined : polos<T>(baris);
}

// Menjalankan pernyataan tulis. Mengembalikan id baris yang baru disisipkan.
export async function jalankan(sql: string, ...p: P[]): Promise<number> {
  return Number((await eksekusi(sql, p)).lastInsertRowid ?? 0);
}

// Menjalankan fn di dalam satu transaksi tulis: semua berhasil atau tidak ada yang tersimpan. Pemanggilan di
// dalam transaksi lain ikut transaksi luarnya. Setiap pemanggilan basis data di dalam fn wajib di-await,
// karena pernyataan yang baru jalan sesudah fn selesai akan mengenai transaksi yang sudah ditutup.
export async function transaksi<T>(fn: () => Promise<T> | T): Promise<T> {
  if (keadaan().transaksi.getStore()) return fn();
  const klien = await buka();
  return antre(() => dalamTransaksi(klien, fn));
}
