import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { Pool, PoolClient } from "pg";
import { isiDataContoh } from "./contoh.ts";

// Mode demo untuk pratinjau tanpa basis data sungguhan: berkas SQLite dan foto ditaruh di /tmp, satu-satunya
// folder yang boleh ditulis di hosting seperti Vercel, lalu diisi data contoh saat masih kosong. Isinya hilang
// setiap kali server dimulai ulang, jadi mode ini tidak untuk data asli.
export const MODE_DEMO = process.env.MODE_DEMO === "1";

// Basis data dijalankan salah satu dari dua mesin, dan kode di luar berkas ini tidak perlu tahu yang mana:
//  - DATABASE_URL diisi: PostgreSQL lewat paket pg. Dipakai di hosting tanpa disk tetap, misalnya Neon di Vercel.
//  - selain itu: satu berkas SQLite di DB_PATH (bawaannya data/tenda.db, atau /tmp di mode demo) lewat
//    node:sqlite bawaan Node. Dipakai di lokal, uji, mode demo, dan server sendiri yang punya disk.
// SQL di aplikasi ditulis dengan bagian yang sah dan sama artinya di kedua mesin, dengan ? sebagai parameter.
const ALAMAT_PG = process.env.DATABASE_URL?.trim() || "";

// Khusus uji: nama skema PostgreSQL yang dibuat kalau belum ada dan dipasang sebagai search_path di setiap
// koneksi, supaya tiap berkas uji punya ruang sendiri di satu basis data.
const SKEMA_PG = process.env.SKEMA_PG?.trim() || "";

export function jalurDb(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  return MODE_DEMO ? "/tmp/tenda-demo/tenda.db" : join(process.cwd(), "data", "tenda.db");
}

// Naikkan angka ini setiap kali db/skema.sql, db/skema-pg.sql, atau KOLOM_TAMBAHAN berubah. PostgreSQL hanya
// dipasangi skema lagi kalau versinya tertinggal.
const VERSI_SKEMA = 1;

// Kolom yang ditambahkan ke berkas SQLite lama sesudah skema awal. ALTER TABLE di SQLite tidak punya
// IF NOT EXISTS, jadi galat "kolom sudah ada" diabaikan. Skema PostgreSQL sudah memuat kolom-kolom ini.
const KOLOM_TAMBAHAN: [tabel: string, kolom: string, tipe: string][] = [
  ["sesi", "batas", "TEXT"],
  ["aset", "kapasitas", "TEXT NOT NULL DEFAULT ''"],
  ["aset", "cocok", "TEXT NOT NULL DEFAULT ''"],
];

// Kunci advisory PostgreSQL. Angkanya bebas, asal tidak dipakai aplikasi lain di basis data yang sama.
const KUNCI_TULIS = 7_141_201;
const KUNCI_SKEMA = 7_141_202;

type P = string | number | bigint | null;
type Baris = Record<string, unknown>;
// Menjalankan satu pernyataan dan mengembalikan barisnya (kosong untuk pernyataan tanpa hasil).
type Pelaksana = (sql: string, p: P[]) => Promise<Baris[]>;

export type Mesin = {
  jenis: "sqlite" | "postgres";
  // Pernyataan di luar transaksi.
  jalan: Pelaksana;
  transaksi<T>(fn: () => Promise<T> | T): Promise<T>;
  tutup(): Promise<void>;
};

type Keadaan = {
  klien?: Promise<Mesin>;
  // Pelaksana transaksi yang sedang berjalan di rantai pemanggilan ini. semua(), satu(), jalankan(), dan
  // sisip() yang dipanggil di dalam transaksi() otomatis memakainya, jadi pemanggil tidak perlu mengoper
  // objek transaksi ke mana-mana.
  transaksi: AsyncLocalStorage<Pelaksana>;
  // Ekor antrean SQLite (lihat antre).
  ekor: Promise<unknown>;
};

// Disimpan di globalThis supaya koneksi tidak dibuka ulang saat dev memuat ulang modul.
function keadaan(): Keadaan {
  const g = globalThis as typeof globalThis & { __dbTenda?: Keadaan };
  g.__dbTenda ??= { transaksi: new AsyncLocalStorage<Pelaksana>(), ekor: Promise.resolve() };
  return g.__dbTenda;
}

// Mesin basis data, dibuka dan disiapkan sekali per proses. Kalau penyiapannya gagal (misalnya SANDI_DEMO belum
// diisi), pemanggilan berikutnya mencoba lagi dari awal dan tidak memakai basis data setengah jadi.
export function buka(): Promise<Mesin> {
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
  if (lama) await (await lama.catch(() => null))?.tutup();
}

async function siapkan(): Promise<Mesin> {
  if (ALAMAT_PG && MODE_DEMO) {
    throw new Error("MODE_DEMO=1 tidak boleh dipakai bersama DATABASE_URL, karena data contoh bisa masuk ke basis data asli.");
  }
  const mesin = ALAMAT_PG ? await bukaPostgres() : await bukaSqlite();
  try {
    if (MODE_DEMO) await isiContohBilaKosong(mesin);
    return mesin;
  } catch (e) {
    await mesin.tutup();
    throw e;
  }
}

// Data contoh diisi di dalam satu transaksi: kalau gagal di tengah, tidak ada yang tersimpan dan pemanggilan
// berikutnya mengulang dari basis data kosong.
async function isiContohBilaKosong(mesin: Mesin): Promise<void> {
  if ((await mesin.jalan("SELECT 1 FROM pengguna LIMIT 1", [])).length) return;
  const sandi = process.env.SANDI_DEMO ?? "";
  if (sandi.length < 8) throw new Error("MODE_DEMO=1 butuh SANDI_DEMO minimal 8 karakter untuk akun contoh.");
  await mesin.transaksi(() => isiDataContoh(sandi));
}

// SQLite

async function bukaSqlite(): Promise<Mesin> {
  const { DatabaseSync } = await import("node:sqlite");
  const jalur = jalurDb();
  if (jalur !== ":memory:") mkdirSync(dirname(jalur), { recursive: true });
  const db = new DatabaseSync(jalur);
  try {
    // WAL membuat pembaca tidak tertahan penulis. busy_timeout adalah lama menunggu kunci kalau berkasnya
    // sedang ditulis proses lain, misalnya skrip seed.
    db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    // Berkas lokal dipasangi skema setiap kali dibuka: murah, dan perubahan skema langsung berlaku.
    db.exec(readFileSync(join(process.cwd(), "db", "skema.sql"), "utf8"));
    for (const [tabel, kolom, tipe] of KOLOM_TAMBAHAN) {
      try {
        db.exec(`ALTER TABLE ${tabel} ADD COLUMN ${kolom} ${tipe}`);
      } catch (e) {
        if (!/duplicate column/i.test(String((e as Error)?.message))) throw e;
      }
    }
    jalankanSqlite(db, "INSERT INTO pengaturan (kunci, nilai) VALUES ('versi_skema', ?) ON CONFLICT (kunci) DO UPDATE SET nilai = excluded.nilai", [
      String(VERSI_SKEMA),
    ]);
  } catch (e) {
    db.close();
    throw e;
  }
  // Eksekusinya sinkron. Fungsi asinkron di sini hanya menyamakan bentuknya dengan PostgreSQL.
  const langsung: Pelaksana = async (sql, p) => jalankanSqlite(db, sql, p);
  return {
    jenis: "sqlite",
    jalan: (sql, p) => antre(() => langsung(sql, p)),
    transaksi: (fn) =>
      antre(async () => {
        // BEGIN IMMEDIATE mengambil kunci tulis sejak awal, jadi dua booking yang berebut aset diproses bergantian.
        db.exec("BEGIN IMMEDIATE");
        try {
          const hasil = await keadaan().transaksi.run(langsung, fn);
          db.exec("COMMIT");
          return hasil;
        } catch (e) {
          if (db.isTransaction) db.exec("ROLLBACK");
          throw e;
        }
      }),
    tutup: async () => db.close(),
  };
}

function jalankanSqlite(db: DatabaseSync, sql: string, p: P[]): Baris[] {
  // node:sqlite mengikat angka JavaScript sebagai REAL. Bilangan bulat diikat sebagai BigInt supaya tersimpan
  // dan dibandingkan sebagai INTEGER (angka 5 di kolom TEXT menjadi '5', bukan '5.0').
  const nilai = p.map((v) => (typeof v === "number" && Number.isSafeInteger(v) ? BigInt(v) : v));
  return db.prepare(sql).all(...nilai) as Baris[];
}

// Berkas SQLite hanya punya satu koneksi di proses ini. Selama transaksi terbuka (antara BEGIN dan COMMIT),
// pernyataan dari permintaan lain yang jalan di koneksi yang sama akan ikut masuk ke transaksi itu. Jadi
// setiap pernyataan di luar transaksi dan setiap transaksi diantrekan satu per satu. Pernyataan di dalam
// transaksi dikenali lewat AsyncLocalStorage dan dijalankan langsung tanpa antre.
function antre<T>(fn: () => Promise<T>): Promise<T> {
  const k = keadaan();
  const hasil = k.ekor.then(fn, fn);
  k.ekor = hasil.then(
    () => undefined,
    () => undefined,
  );
  return hasil;
}

// PostgreSQL

async function bukaPostgres(): Promise<Mesin> {
  if (SKEMA_PG && !/^[a-z_][a-z0-9_]{0,62}$/.test(SKEMA_PG)) {
    throw new Error("SKEMA_PG hanya boleh berisi huruf kecil, angka, dan garis bawah.");
  }
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: ALAMAT_PG,
    max: 5,
    // PostgreSQL mengirim int8 (COUNT dan kolom BIGINT, OID 20) dan numeric (SUM dari BIGINT, OID 1700) sebagai
    // teks supaya presisinya utuh. Angka di aplikasi ini jauh di bawah 2^53, jadi aman diubah ke Number.
    types: {
      getTypeParser: ((oid: number, format?: "text" | "binary") =>
        oid === 20 || oid === 1700 ? (v: string) => Number(v) : pg.types.getTypeParser(oid, format)) as typeof pg.types.getTypeParser,
    },
    ...(SKEMA_PG ? { options: `-c search_path=${SKEMA_PG}` } : {}),
  });
  // Koneksi yang menganggur bisa diputus server (misalnya Neon yang tertidur). Tanpa penangan ini galatnya
  // menghentikan proses. Pool membuka koneksi baru saat dibutuhkan lagi.
  pool.on("error", (e) => console.warn(`Koneksi PostgreSQL yang menganggur terputus: ${e.message}`));
  try {
    await pasangSkemaPg(pool);
  } catch (e) {
    await pool.end();
    throw e;
  }
  return {
    jenis: "postgres",
    // Di luar transaksi tidak perlu antre: setiap pernyataan memakai koneksi sendiri dari pool.
    jalan: pelaksanaPg(pool),
    transaksi: (fn) =>
      dalamTransaksiPg(pool, async (klien) => {
        // Kunci tulis untuk seluruh basis data, supaya transaksi diproses satu per satu seperti BEGIN IMMEDIATE
        // di SQLite. Cek ketersediaan aset saat booking bergantung pada sifat ini. Kuncinya lepas sendiri saat
        // COMMIT atau ROLLBACK.
        await klien.query(`SELECT pg_advisory_xact_lock(${KUNCI_TULIS})`);
        return keadaan().transaksi.run(pelaksanaPg(klien), fn);
      }),
    tutup: () => pool.end(),
  };
}

function pelaksanaPg(k: Pool | PoolClient): Pelaksana {
  return async (sql, p) => (await k.query<Baris>(ubahTanda(sql), p)).rows;
}

// Tanda ? diganti $1, $2, dan seterusnya. Tanda tanya di dalam teks bertanda kutip tunggal dibiarkan.
export function ubahTanda(sql: string): string {
  let n = 0;
  let kutip = false;
  let hasil = "";
  for (const c of sql) {
    if (c === "'") kutip = !kutip;
    hasil += c === "?" && !kutip ? `$${++n}` : c;
  }
  return hasil;
}

async function dalamTransaksiPg<T>(pool: Pool, fn: (klien: PoolClient) => Promise<T>): Promise<T> {
  const klien = await pool.connect();
  let rusak: Error | undefined;
  try {
    await klien.query("BEGIN");
    const hasil = await fn(klien);
    await klien.query("COMMIT");
    return hasil;
  } catch (e) {
    await klien.query("ROLLBACK").catch((g: Error) => {
      rusak = g;
    });
    throw e;
  } finally {
    // Koneksi yang gagal di-ROLLBACK dibuang dari pool supaya transaksinya yang menggantung tidak dipakai ulang.
    klien.release(rusak);
  }
}

// Skema dipasang di dalam transaksi berkunci, supaya dua server yang bangun bersamaan tidak memasangnya
// berbarengan. Versi dicek dulu di luar transaksi dengan satu kueri murah, supaya server yang baru bangun
// tidak mengirim seluruh skema setiap kali.
async function pasangSkemaPg(pool: Pool): Promise<void> {
  if (SKEMA_PG) await pool.query(`CREATE SCHEMA IF NOT EXISTS ${SKEMA_PG}`);
  if ((await versiPg(pool)) >= VERSI_SKEMA) return;
  await dalamTransaksiPg(pool, async (klien) => {
    await klien.query(`SELECT pg_advisory_xact_lock(${KUNCI_SKEMA})`);
    // Server lain mungkin sudah memasangnya selagi kunci ini ditunggu.
    if ((await versiPg(klien)) >= VERSI_SKEMA) return;
    await klien.query(readFileSync(join(process.cwd(), "db", "skema-pg.sql"), "utf8"));
    await klien.query("INSERT INTO pengaturan (kunci, nilai) VALUES ('versi_skema', $1) ON CONFLICT (kunci) DO UPDATE SET nilai = excluded.nilai", [
      String(VERSI_SKEMA),
    ]);
  });
}

async function versiPg(k: Pool | PoolClient): Promise<number> {
  // Tabel pengaturan belum ada berarti basis datanya masih kosong. Keberadaannya dicek lewat to_regclass,
  // karena kueri yang gagal di dalam transaksi PostgreSQL membatalkan seluruh transaksinya.
  const ada = (await k.query<{ ada: boolean }>("SELECT to_regclass('pengaturan') IS NOT NULL AS ada")).rows[0].ada;
  if (!ada) return 0;
  const baris = (await k.query<{ nilai: string }>("SELECT nilai FROM pengaturan WHERE kunci = 'versi_skema'")).rows[0];
  return Number(baris?.nilai ?? 0);
}

// API untuk seluruh aplikasi

async function eksekusi(sql: string, p: P[]): Promise<Baris[]> {
  const dalam = keadaan().transaksi.getStore();
  if (dalam) return dalam(sql, p);
  return (await buka()).jalan(sql, p);
}

// Baris dari kedua mesin bisa berupa objek tanpa prototipe. Disalin menjadi objek biasa supaya aman dioper ke
// komponen klien dan dibandingkan di uji.
function polos<T>(baris: unknown): T {
  return { ...(baris as object) } as T;
}

export async function semua<T>(sql: string, ...p: P[]): Promise<T[]> {
  return (await eksekusi(sql, p)).map((b) => polos<T>(b));
}

export async function satu<T>(sql: string, ...p: P[]): Promise<T | undefined> {
  const baris = (await eksekusi(sql, p))[0];
  return baris === undefined ? undefined : polos<T>(baris);
}

// Menjalankan pernyataan tulis tanpa hasil.
export async function jalankan(sql: string, ...p: P[]): Promise<void> {
  await eksekusi(sql, p);
}

// Menjalankan satu INSERT dan mengembalikan id baris barunya. RETURNING didukung kedua mesin.
export async function sisip(sql: string, ...p: P[]): Promise<number> {
  if (!/^\s*INSERT\s/i.test(sql)) throw new Error("sisip() hanya untuk pernyataan INSERT.");
  const baris = (await eksekusi(`${sql} RETURNING id`, p))[0];
  return Number(baris?.id);
}

// Menjalankan fn di dalam satu transaksi tulis: semua berhasil atau tidak ada yang tersimpan. Pemanggilan di
// dalam transaksi lain ikut transaksi luarnya. Setiap pemanggilan basis data di dalam fn wajib di-await,
// karena pernyataan yang baru jalan sesudah fn selesai akan mengenai transaksi yang sudah ditutup.
export async function transaksi<T>(fn: () => Promise<T> | T): Promise<T> {
  if (keadaan().transaksi.getStore()) return fn();
  return (await buka()).transaksi(fn);
}
