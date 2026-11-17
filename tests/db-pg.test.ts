import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { PG, siapkanBasisUji } from "./basis-uji.ts";

// Perilaku khusus PostgreSQL: skema dipasang menurut versinya, DB_PATH diabaikan, dan jejak audit juga menolak
// TRUNCATE. Uji yang butuh server hanya jalan lewat npm run test:pg.
const folder = mkdtempSync(join(tmpdir(), "tenda-uji-pg-"));
const berkasLokal = join(folder, "lokal-tidak-dipakai.db");
const buang = siapkanBasisUji(berkasLokal);
process.env.DB_PATH = berkasLokal;
delete process.env.MODE_DEMO;

const { jalankan, satu, semua, tutup, ubahTanda } = await import("../src/lib/db.ts");

after(async () => {
  await tutup();
  await buang();
  rmSync(folder, { recursive: true, force: true });
});

const lewati = PG ? false : "butuh PostgreSQL, jalankan lewat npm run test:pg";
const versi = async () => (await satu<{ nilai: string }>("SELECT nilai FROM pengaturan WHERE kunci = 'versi_skema'"))?.nilai;

test("tanda ? menjadi $1, $2, dan seterusnya, kecuali di dalam teks bertanda kutip", () => {
  assert.equal(ubahTanda("SELECT * FROM t WHERE a = ? AND b IN (?, ?)"), "SELECT * FROM t WHERE a = $1 AND b IN ($2, $3)");
  assert.equal(ubahTanda("SELECT 'apa?', ? FROM t WHERE c = 'it''s ?' AND d = ?"), "SELECT 'apa?', $1 FROM t WHERE c = 'it''s ?' AND d = $2");
});

test("basis data kosong dipasangi skema lengkap dan versinya dicatat, tanpa menyentuh DB_PATH", { skip: lewati }, async () => {
  assert.deepEqual(await semua("SELECT 1 FROM kontak"), []);
  assert.equal(await versi(), "1");
  const kolom = (
    await semua<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'aset'",
    )
  ).map((k) => k.column_name);
  assert.ok(kolom.includes("kapasitas") && kolom.includes("cocok"), "kolom tambahan ikut terpasang");
  assert.equal(existsSync(berkasLokal), false);
});

test("skema tidak dipasang ulang selama versinya sama, dan dipasang lagi kalau versinya tertinggal", { skip: lewati }, async () => {
  await jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Tetap ada', '2026-11-17')");
  await jalankan("DROP TABLE pembatas");
  await tutup();
  // Versi masih sama: server yang baru bangun tidak memasang skema, jadi tabel yang dibuang tetap tidak ada.
  await assert.rejects(semua("SELECT 1 FROM pembatas"), /does not exist/i);
  await jalankan("UPDATE pengaturan SET nilai = '0' WHERE kunci = 'versi_skema'");
  await tutup();
  // Versi tertinggal: skema dipasang lagi tanpa mengganggu data yang ada.
  assert.deepEqual(await semua("SELECT 1 FROM pembatas"), []);
  assert.equal(await versi(), "1");
  assert.deepEqual(await semua("SELECT nama FROM kontak"), [{ nama: "Tetap ada" }]);
});

test("jejak audit juga tidak bisa dikosongkan dengan TRUNCATE", { skip: lewati }, async () => {
  await assert.rejects(jalankan("TRUNCATE log_aktivitas"), /tidak bisa dihapus/);
});
