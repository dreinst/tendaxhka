// Penyiapan basis data untuk berkas uji. npm test memakai SQLite. npm run test:pg (UJI_MESIN=pg) menjalankan
// berkas uji yang sama terhadap PostgreSQL dari UJI_DATABASE_URL, dan tiap berkas uji mendapat skema acak
// sendiri (lewat SKEMA_PG) yang dibuang sesudahnya.
import { randomBytes } from "node:crypto";

export const PG = process.env.UJI_MESIN === "pg";

// Dipanggil sebelum src/lib/db.ts diimpor. jalurSqlite (":memory:" atau berkas) dipakai kalau mesinnya SQLite.
// Mengembalikan fungsi untuk membuang skema uji PostgreSQL, dipanggil sesudah tutup().
export function siapkanBasisUji(jalurSqlite: string): () => Promise<void> {
  // DATABASE_URL dari lingkungan pemanggil tidak boleh ikut terbawa, supaya uji tidak pernah mengenai basis
  // data asli.
  delete process.env.DATABASE_URL;
  delete process.env.SKEMA_PG;
  if (!PG) {
    process.env.DB_PATH = jalurSqlite;
    return async () => {};
  }
  const alamat = process.env.UJI_DATABASE_URL?.trim();
  if (!alamat) throw new Error("npm run test:pg butuh UJI_DATABASE_URL berisi alamat PostgreSQL khusus uji.");
  const skema = `uji_${randomBytes(6).toString("hex")}`;
  process.env.DATABASE_URL = alamat;
  process.env.SKEMA_PG = skema;
  return async () => {
    const { default: pg } = await import("pg");
    const klien = new pg.Client({ connectionString: alamat });
    await klien.connect();
    try {
      await klien.query(`DROP SCHEMA IF EXISTS ${skema} CASCADE`);
    } finally {
      await klien.end();
    }
  };
}
