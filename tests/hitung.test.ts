import assert from "node:assert/strict";
import { test } from "node:test";
import { bacaChecklist, batasBulan, boleh, hitungLaba, rentangHari, sisaTersedia, tanggalSah, totalPesanan, utilisasi, type Pakai } from "../src/lib/hitung.ts";

test("total pesanan mengalikan jumlah, hari, dan harga lalu memotong diskon", () => {
  const baris = [{ jumlah: 4, hari: 2, harga: 900_000 }, { jumlah: 1, hari: 1, harga: 1_500_000 }];
  assert.deepEqual(totalPesanan(baris, 200_000), { subtotal: 8_700_000, total: 8_500_000 });
  assert.equal(totalPesanan(baris, 99_000_000).total, 0);
});

test("tanggal dan rentang", () => {
  assert.equal(tanggalSah("2026-02-29"), false);
  assert.equal(tanggalSah("2028-02-29"), true);
  assert.deepEqual(rentangHari("2026-12-30", "2027-01-02"), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  assert.deepEqual(batasBulan("2026-11"), { awal: "2026-11-01", akhir: "2026-11-30", hari: 30 });
});

test("sisa tersedia ditentukan hari yang paling padat", () => {
  const pakai: Pakai[] = [
    { asetId: 1, jumlah: 6, awal: "2026-11-10", akhir: "2026-11-12" },
    { asetId: 1, jumlah: 3, awal: "2026-11-12", akhir: "2026-11-14" },
    { asetId: 2, jumlah: 9, awal: "2026-11-01", akhir: "2026-11-30" },
  ];
  assert.equal(sisaTersedia(10, pakai, 1, "2026-11-10", "2026-11-11"), 4);
  assert.equal(sisaTersedia(10, pakai, 1, "2026-11-11", "2026-11-13"), 1);
  assert.equal(sisaTersedia(10, pakai, 1, "2026-11-15", "2026-11-16"), 10);
});

test("unit yang masih diperbaiki mengurangi ketersediaan tanpa batas akhir", () => {
  const pakai: Pakai[] = [{ asetId: 1, jumlah: 2, awal: "2026-11-10", akhir: null }];
  assert.equal(sisaTersedia(10, pakai, 1, "2026-11-01", "2026-11-09"), 10);
  assert.equal(sisaTersedia(10, pakai, 1, "2027-03-01", "2027-03-02"), 8);
});

test("utilisasi adalah unit-hari tersewa dibagi unit-hari dimiliki", () => {
  const sewa: Pakai[] = [{ asetId: 1, jumlah: 5, awal: "2026-10-28", akhir: "2026-11-03" }];
  assert.equal(utilisasi(10, sewa, 1, "2026-11"), (5 * 3) / (10 * 30));
  assert.equal(utilisasi(0, sewa, 1, "2026-11"), 0);
});

test("nett profit dibagi sesuai porsi dan kedua bagian selalu berjumlah sama dengan labanya", () => {
  const h = hitungLaba({ pendapatan: 100_000_001, biayaLangsung: 30_000_000, biayaOperasional: 20_000_000, persenCadangan: 10, persenPajak: 0.5, porsiTenda: 50 });
  assert.equal(h.pajak, 500_000);
  assert.equal(h.cadangan, 4_950_000);
  assert.equal(h.labaBersih, 44_550_001);
  assert.equal(h.bagianTenda + h.bagianHka, h.labaBersih);
});

test("saat rugi tidak ada cadangan dan ruginya ikut dibagi", () => {
  const h = hitungLaba({ pendapatan: 10_000_000, biayaLangsung: 8_000_000, biayaOperasional: 6_000_000, persenCadangan: 10, persenPajak: 0, porsiTenda: 50 });
  assert.equal(h.cadangan, 0);
  assert.equal(h.labaBersih, -4_000_000);
  assert.equal(h.bagianTenda, -2_000_000);
  assert.equal(h.bagianHka, -2_000_000);
});

test("partner hanya melihat, kru hanya mencentang", () => {
  assert.equal(boleh("partner", "keuangan.lihat"), true);
  assert.equal(boleh("partner", "keuangan.tulis"), false);
  assert.equal(boleh("partner", "pesanan.tulis"), false);
  assert.equal(boleh("kru", "jadwal.centang"), true);
  assert.equal(boleh("kru", "keuangan.lihat"), false);
  assert.equal(boleh("sales", "keuangan.lihat"), false);
});

test("checklist yang rusak dibaca sebagai kosong", () => {
  assert.deepEqual(bacaChecklist("bukan json"), []);
  assert.deepEqual(bacaChecklist('[{"teks":"a","beres":true},{"x":1}]'), [{ teks: "a", beres: true }]);
});
