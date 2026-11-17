import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AsyncLocalStorage } from "node:async_hooks";
import { after, test } from "node:test";
import { PG, siapkanBasisUji } from "./basis-uji.ts";

// Di SQLite memakai berkas sungguhan, bukan :memory:, supaya perilaku berkas (WAL dan kunci tulis) ikut teruji.
const folder = mkdtempSync(join(tmpdir(), "tenda-uji-db-"));
const buang = siapkanBasisUji(join(folder, "tenda.db"));

const { buka, jalankan, satu, semua, sisip, transaksi, tutup } = await import("../src/lib/db.ts");

after(async () => {
  await tutup();
  await buang();
  rmSync(folder, { recursive: true, force: true });
});

const jeda = (ms: number) => new Promise((selesai) => setTimeout(selesai, ms));
const jumlahKontak = async () => (await satu<{ n: number }>("SELECT COUNT(*) AS n FROM kontak"))!.n;

// Meniru permintaan lain yang tidak berada di dalam transaksi mana pun. AsyncLocalStorage.exit menjalankan
// fungsi di luar konteks transaksi milik db.ts, sama seperti permintaan HTTP lain yang datang bersamaan.
await buka();
const konteks = (globalThis as unknown as { __dbTenda: { transaksi: AsyncLocalStorage<unknown> } }).__dbTenda.transaksi;
const permintaanLain = () => konteks.exit(() => jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Dari luar', '2026-11-17')"));

test("basis data kosong langsung berisi skema, dan klien yang sama dipakai ulang", async () => {
  const a = await buka();
  assert.equal(await buka(), a);
  assert.equal(await jumlahKontak(), 0);
  assert.deepEqual(await satu("SELECT nilai FROM pengaturan WHERE kunci = 'versi_skema'"), { nilai: "1" });
});

test("sisip mengembalikan id baris baru dan baris dikembalikan sebagai objek biasa", async () => {
  const id = await sisip("INSERT INTO kontak (nama, dibuat) VALUES (?, ?)", "Satu", "2026-11-17");
  assert.equal(typeof id, "number");
  const baris = await satu<{ id: number; nama: string }>("SELECT id, nama FROM kontak WHERE id = ?", id);
  assert.deepEqual(baris, { id, nama: "Satu" });
  assert.equal(Object.getPrototypeOf(baris), Object.prototype);
  assert.deepEqual(Object.getOwnPropertyNames(baris), ["id", "nama"]);
  assert.equal(await satu("SELECT 1 FROM kontak WHERE id = -1"), undefined);
  assert.deepEqual(await semua("SELECT nama FROM kontak WHERE id = ?", id), [{ nama: "Satu" }]);
});

test("transaksi yang gagal tidak menyimpan apa pun", async () => {
  const awal = await jumlahKontak();
  await assert.rejects(
    transaksi(async () => {
      await jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Batal', '2026-11-17')");
      assert.equal(await jumlahKontak(), awal + 1, "di dalam transaksi barisnya terlihat");
      throw new Error("sengaja");
    }),
    /sengaja/,
  );
  assert.equal(await jumlahKontak(), awal);
});

test("transaksi di dalam transaksi ikut transaksi luarnya", async () => {
  const awal = await jumlahKontak();
  await assert.rejects(
    transaksi(async () => {
      await transaksi(async () => {
        await jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Dalam', '2026-11-17')");
      });
      throw new Error("luar gagal");
    }),
    /luar gagal/,
  );
  assert.equal(await jumlahKontak(), awal, "bagian dalam ikut batal");
  const hasil = await transaksi(async () => {
    await jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Luar', '2026-11-17')");
    return transaksi(async () => sisip("INSERT INTO kontak (nama, dibuat) VALUES ('Dalam', '2026-11-17')"));
  });
  assert.equal(typeof hasil, "number");
  assert.equal(await jumlahKontak(), awal + 2);
});

test("dua transaksi yang berebut diproses bergantian, tidak saling menimpa", async () => {
  await jalankan("INSERT INTO pengaturan (kunci, nilai) VALUES ('uji_hitung', '0')");
  const tambah = () =>
    transaksi(async () => {
      const kini = Number((await satu<{ nilai: string }>("SELECT nilai FROM pengaturan WHERE kunci = 'uji_hitung'"))!.nilai);
      // Jeda sungguhan di tengah transaksi. Tanpa giliran, kedua transaksi membaca angka yang sama.
      await jeda(15);
      await jalankan("UPDATE pengaturan SET nilai = ? WHERE kunci = 'uji_hitung'", String(kini + 1));
    });
  await Promise.all(Array.from({ length: 8 }, tambah));
  assert.equal((await satu<{ nilai: string }>("SELECT nilai FROM pengaturan WHERE kunci = 'uji_hitung'"))!.nilai, "8");
});

// Di SQLite semuanya lewat satu koneksi, jadi tulisan dari luar harus menunggu supaya tidak ikut masuk ke
// transaksi yang terbuka. Di PostgreSQL tulisan itu memakai koneksi lain dari pool dan langsung jalan.
// Di kedua mesin tulisan itu tidak boleh ditolak.
test("pernyataan di luar transaksi tidak ditolak selama transaksi terbuka (di SQLite menunggu gilirannya)", async () => {
  const awal = await jumlahKontak();
  let luarSelesai = false;
  let luar: Promise<unknown> = Promise.resolve();
  await transaksi(async () => {
    await jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Di dalam', '2026-11-17')");
    luar = permintaanLain().then(() => (luarSelesai = true));
    await jeda(30);
    if (!PG) assert.equal(luarSelesai, false, "tulisan dari permintaan lain belum jalan selama transaksi terbuka");
  });
  await luar;
  assert.equal(await jumlahKontak(), awal + 2);
});

test("galat basis data keluar sebagai galat biasa dan koneksi tetap bisa dipakai", async () => {
  await assert.rejects(jalankan("INSERT INTO kontak (nama) VALUES (NULL)"), /NOT NULL|constraint/i);
  await assert.rejects(semua("SELECT * FROM tabel_tidak_ada"), /no such table|does not exist/i);
  assert.ok((await jumlahKontak()) > 0);
});

test("menghapus induk ikut menghapus anaknya (foreign key aktif)", async () => {
  const aset = await sisip("INSERT INTO aset (kode, nama, kategori, jumlah) VALUES ('UJI-FK', 'Uji', 'Uji', 1)");
  await jalankan("INSERT INTO aset_foto (aset_id, berkas) VALUES (?, 'uji-fk.jpg')", aset);
  await jalankan("DELETE FROM aset WHERE id = ?", aset);
  assert.deepEqual(await semua("SELECT 1 FROM aset_foto WHERE berkas = 'uji-fk.jpg'"), []);
  await assert.rejects(jalankan("INSERT INTO aset_foto (aset_id, berkas) VALUES (999999, 'yatim.jpg')"), /FOREIGN KEY|constraint/i);
});
