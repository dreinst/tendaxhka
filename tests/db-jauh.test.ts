import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

// Cabang kode untuk basis data jarak jauh, dijalankan tanpa server: TURSO_DATABASE_URL diisi alamat file:.
// Yang teruji di sini adalah perilaku kode sendiri saat alamat jarak jauh dipakai (skema dipasang menurut
// versinya, tanpa PRAGMA, DB_PATH diabaikan). Sambungan jaringan ke Turso tidak ikut teruji.
const folder = mkdtempSync(join(tmpdir(), "tenda-uji-jauh-"));
const berkasLokal = join(folder, "lokal-tidak-dipakai.db");
process.env.DB_PATH = berkasLokal;
process.env.TURSO_DATABASE_URL = `file:${join(folder, "jauh.db")}`;
delete process.env.MODE_DEMO;

const { jalankan, satu, semua, transaksi, tutup } = await import("../src/lib/db.ts");

after(async () => {
  await tutup();
  rmSync(folder, { recursive: true, force: true });
});

const versi = async () => (await satu<{ nilai: string }>("SELECT nilai FROM pengaturan WHERE kunci = 'versi_skema'"))?.nilai;

test("basis data kosong dipasangi skema lengkap dan versinya dicatat, tanpa menyentuh DB_PATH", async () => {
  assert.deepEqual(await semua("SELECT 1 FROM kontak"), []);
  assert.equal(await versi(), "1");
  const kolom = (await semua<{ name: string }>("SELECT name FROM pragma_table_info('aset')")).map((k) => k.name);
  assert.ok(kolom.includes("kapasitas") && kolom.includes("cocok"), "kolom tambahan ikut terpasang");
  assert.equal(existsSync(berkasLokal), false);
});

test("skema tidak dikirim ulang selama versinya sama, dan dipasang lagi kalau versinya tertinggal", async () => {
  await jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Tetap ada', '2026-11-17')");
  await jalankan("DROP TABLE pembatas");
  await tutup();
  // Versi masih sama: server yang baru bangun tidak memasang skema, jadi tabel yang dibuang tetap tidak ada.
  await assert.rejects(semua("SELECT 1 FROM pembatas"), /no such table/i);
  await jalankan("UPDATE pengaturan SET nilai = '0' WHERE kunci = 'versi_skema'");
  await tutup();
  // Versi tertinggal: skema dipasang lagi tanpa mengganggu data yang ada.
  assert.deepEqual(await semua("SELECT 1 FROM pembatas"), []);
  assert.equal(await versi(), "1");
  assert.deepEqual(await semua("SELECT nama FROM kontak"), [{ nama: "Tetap ada" }]);
});

test("transaksi tetap utuh: gagal berarti tidak ada yang tersimpan", async () => {
  await assert.rejects(
    transaksi(async () => {
      await jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Batal', '2026-11-17')");
      throw new Error("sengaja");
    }),
    /sengaja/,
  );
  await transaksi(async () => {
    await jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Jadi', '2026-11-17')");
  });
  assert.deepEqual(
    (await semua<{ nama: string }>("SELECT nama FROM kontak ORDER BY id")).map((k) => k.nama),
    ["Tetap ada", "Jadi"],
  );
});
