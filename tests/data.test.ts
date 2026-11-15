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

test("hari terpadat menghitung booking dan perawatan sejak tanggal awal", async () => {
  const { hariTerpadat } = await import("../src/lib/data.ts");
  const kursi = jalankan("INSERT INTO aset (kode, nama, kategori, jumlah, harga) VALUES ('K1', 'Kursi', 'Kursi', 5, 1000)");
  const baris = (id: number, n: number) =>
    jalankan("INSERT INTO pesanan_baris (pesanan_id, aset_id, deskripsi, jumlah, hari, harga) VALUES (?, ?, 'Kursi', ?, 1, 1000)", id, kursi, n);
  assert.equal(hariTerpadat(kursi, "2026-12-01"), null);
  const pesan = (nomor: string, mulai: string, selesai: string, status: string) =>
    jalankan(
      "INSERT INTO pesanan (nomor, kontak_id, acara, mulai, selesai, status, dibuat) VALUES (?, ?, 'Acara', ?, ?, ?, '2026-11-01')",
      nomor, kontak, mulai, selesai, status,
    );
  baris(pesan("K-A", "2026-12-03", "2026-12-04", "booking"), 3);
  baris(pesan("K-B", "2026-12-04", "2026-12-05", "booking"), 2);
  baris(pesan("K-C", "2026-12-04", "2026-12-04", "penawaran"), 5);
  assert.deepEqual(hariTerpadat(kursi, "2026-12-01"), { tanggal: "2026-12-04", jumlah: 5 });
  jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai) VALUES (?, 1, '2026-12-02')", kursi);
  assert.deepEqual(hariTerpadat(kursi, "2026-12-01"), { tanggal: "2026-12-04", jumlah: 6 });
  assert.equal(hariTerpadat(kursi, "2026-12-06"), null);
});

test("jejak audit tercatat dan tidak bisa diubah atau dihapus", async () => {
  const { catatLog, daftarLog } = await import("../src/lib/data.ts");
  catatLog({ id: 1, nama: "Penguji" }, "Catat pembayaran masuk", "TI-001, Rp 500.000");
  const bulan = (await import("../src/lib/format.ts")).hariIni().slice(0, 7);
  const [l] = daftarLog(bulan);
  assert.equal(l.pengguna, "Penguji");
  assert.equal(l.aksi, "Catat pembayaran masuk");
  assert.match(l.waktu, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.throws(() => jalankan("UPDATE log_aktivitas SET rincian = 'diubah' WHERE id = ?", l.id), /tidak bisa diubah/);
  assert.throws(() => jalankan("DELETE FROM log_aktivitas WHERE id = ?", l.id), /tidak bisa dihapus/);
});

test("unit dirawat menjumlahkan perawatan yang masih berjalan", async () => {
  const { unitDirawat } = await import("../src/lib/data.ts");
  const lampu = jalankan("INSERT INTO aset (kode, nama, kategori, jumlah, harga) VALUES ('L1', 'Lampu', 'Lampu', 10, 1000)");
  assert.equal(unitDirawat(lampu, "2026-12-01"), 0);
  jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai) VALUES (?, 4, '2026-11-20')", lampu);
  jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai, selesai) VALUES (?, 3, '2026-11-10', '2026-12-05')", lampu);
  jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai, selesai) VALUES (?, 2, '2026-11-01', '2026-11-15')", lampu);
  assert.equal(unitDirawat(lampu, "2026-12-01"), 7);
  assert.equal(unitDirawat(lampu, "2026-12-06"), 4);
});
