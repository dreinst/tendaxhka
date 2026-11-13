import assert from "node:assert/strict";
import { test } from "node:test";

process.env.DB_PATH = ":memory:";

const { biayaBulan, bulanTerkunci, daftarPesanan, kekurangan, kunciBulan, labaBulan, nomorBerikut, pendapatanBulan } = await import("../src/lib/data.ts");
const { jalankan } = await import("../src/lib/db.ts");

const tenda = jalankan("INSERT INTO aset (kode, nama, kategori, jumlah, harga) VALUES ('T1', 'Tenda', 'Tenda', 10, 1000000)");
const kontak = jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Uji', '2026-11-01')");

function pesanan(nomor: string, mulai: string, selesai: string, status: string, jumlah: number): number {
  const id = jalankan(
    "INSERT INTO pesanan (nomor, kontak_id, acara, mulai, selesai, status, dibuat) VALUES (?, ?, 'Acara', ?, ?, ?, '2026-11-01')",
    nomor, kontak, mulai, selesai, status,
  );
  jalankan("INSERT INTO pesanan_baris (pesanan_id, aset_id, deskripsi, jumlah, hari, harga) VALUES (?, ?, 'Tenda', ?, 1, 1000000)", id, tenda, jumlah);
  return id;
}

test("booking yang bersinggungan mengurangi sisa, penawaran tidak", () => {
  pesanan("A", "2026-11-10", "2026-11-12", "booking", 6);
  pesanan("B", "2026-11-11", "2026-11-11", "penawaran", 9);
  const c = pesanan("C", "2026-11-12", "2026-11-13", "penawaran", 5);
  assert.deepEqual(kekurangan(c), ["Tenda: butuh 5, tersedia 4"]);
  const d = pesanan("D", "2026-11-13", "2026-11-14", "penawaran", 10);
  assert.deepEqual(kekurangan(d), []);
});

test("unit yang diperbaiki ikut dihitung", () => {
  const e = pesanan("E", "2026-12-01", "2026-12-02", "penawaran", 9);
  assert.deepEqual(kekurangan(e), []);
  jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai) VALUES (?, 2, '2026-11-20')", tenda);
  assert.deepEqual(kekurangan(e), ["Tenda: butuh 9, tersedia 8"]);
});

test("total, dibayar, dan sisa pesanan", () => {
  const id = pesanan("F", "2027-01-05", "2027-01-06", "booking", 3);
  jalankan("UPDATE pesanan SET diskon = 500000, tgl_faktur = '2027-01-06' WHERE id = ?", id);
  jalankan("INSERT INTO pembayaran (pesanan_id, tanggal, jumlah) VALUES (?, '2026-12-28', 1000000)", id);
  const p = daftarPesanan("WHERE p.id = ?", id)[0];
  assert.deepEqual([p.subtotal, p.total, p.dibayar, p.sisa], [3_000_000, 2_500_000, 1_000_000, 1_500_000]);
});

test("pendapatan basis kas memakai tanggal bayar, basis akrual memakai tanggal faktur", () => {
  assert.equal(pendapatanBulan("2026-12", "kas"), 1_000_000);
  assert.equal(pendapatanBulan("2027-01", "kas"), 0);
  assert.equal(pendapatanBulan("2027-01", "akrual"), 2_500_000);
});

test("bulan yang ditutup memakai angka beku", () => {
  jalankan("INSERT INTO biaya (tanggal, jenis, kategori, jumlah) VALUES ('2026-12-10', 'operasional', 'Sewa gudang', 400000)");
  assert.deepEqual(biayaBulan("2026-12"), { langsung: 0, operasional: 400_000 });
  assert.equal(labaBulan("2026-12").labaBersih, 600_000);
  assert.equal(bulanTerkunci("2026-12-15"), false);
  kunciBulan("2026-12", "2027-01-02T00:00:00.000Z");
  assert.equal(bulanTerkunci("2026-12-15"), true);
  jalankan("INSERT INTO biaya (tanggal, jenis, kategori, jumlah) VALUES ('2026-12-11', 'operasional', 'Susulan', 100000)");
  const l = labaBulan("2026-12");
  assert.deepEqual([l.labaBersih, l.bagianTenda, l.bagianHka], [600_000, 300_000, 300_000]);
});

test("nomor pesanan berurut per bulan", () => {
  assert.equal(nomorBerikut("2027-03-09"), "TI-2703-001");
  jalankan("INSERT INTO pesanan (nomor, kontak_id, acara, mulai, selesai, dibuat) VALUES ('TI-2703-001', ?, 'X', '2027-03-10', '2027-03-10', '2027-03-09')", kontak);
  assert.equal(nomorBerikut("2027-03-20"), "TI-2703-002");
});
