import assert from "node:assert/strict";
import { test } from "node:test";
import { bacaChecklist, bacaRupiah, batasBulan, boleh, bulanSah, galatLamaPesanan, geserBulanSah, hitungLaba, namaFotoSah, nomorWa, rentangHari, sisaTersedia, tampakJpeg, tanggalSah, totalPesanan, urlFoto, utilisasi, type Pakai } from "../src/lib/hitung.ts";

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

test("nomor WhatsApp dinormalkan ke format 62", () => {
  assert.equal(nomorWa("0812-3456-7890"), "6281234567890");
  assert.equal(nomorWa("+62 812 3456 7890"), "6281234567890");
  assert.equal(nomorWa("812 3456 7890"), "6281234567890");
  assert.equal(nomorWa("(0341) 123456"), null);
  assert.equal(nomorWa(""), null);
});

test("nama berkas foto hanya menerima bentuk buatan server", () => {
  assert.equal(namaFotoSah("0123456789abcdef0123456789abcdef.jpg"), true);
  assert.equal(namaFotoSah("../tenda.db"), false);
  assert.equal(namaFotoSah("0123456789abcdef0123456789abcdef.png"), false);
  assert.equal(namaFotoSah("0123456789ABCDEF0123456789abcdef.jpg"), false);
  assert.equal(namaFotoSah("0123456789abcdef0123456789abcdef.jpg/../x"), false);
});

test("pemeriksaan JPEG melihat penanda awal dan akhir", () => {
  assert.equal(tampakJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9])), true);
  assert.equal(tampakJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 0xff, 0xd9])), false);
  assert.equal(tampakJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])), false);
  assert.equal(tampakJpeg(new Uint8Array([])), false);
});

test("token sesi demo hanya sah dengan kunci yang sama dan sebelum habis", async () => {
  const { bacaSesiDemo, tokenSesiDemo } = await import("../src/lib/sandi.ts");
  const t = tokenSesiDemo("admin", 2_000, "kunci-a");
  assert.equal(bacaSesiDemo(t, "kunci-a", 1_000), "admin");
  assert.equal(bacaSesiDemo(t, "kunci-b", 1_000), null);
  assert.equal(bacaSesiDemo(t, "kunci-a", 2_000), null);
  const [isi, tanda] = t.split(".");
  const palsu = Buffer.from(JSON.stringify({ u: "admin", e: 9_999_999 })).toString("base64url");
  assert.equal(bacaSesiDemo(`${palsu}.${tanda}`, "kunci-a", 1_000), null);
  assert.equal(bacaSesiDemo(isi, "kunci-a", 1_000), null);
  assert.equal(bacaSesiDemo("bukan-token", "kunci-a", 1_000), null);
});

test("alamat foto: bawaan dari public, unggahan lewat /foto", () => {
  assert.equal(urlFoto("katalog/02-sarnafil-5x5.jpg"), "/katalog/02-sarnafil-5x5.jpg");
  assert.equal(urlFoto("0123456789abcdef0123456789abcdef.jpg"), "/foto/0123456789abcdef0123456789abcdef.jpg");
  // Jalur yang menyelip tidak dianggap foto bawaan.
  assert.equal(urlFoto("katalog/../rahasia.jpg"), "/foto/katalog/../rahasia.jpg");
  assert.equal(namaFotoSah("katalog/02-sarnafil-5x5.jpg"), false);
});

test("tanggal ekstrem ditolak dan rentang tidak pernah berputar tanpa henti", () => {
  assert.equal(tanggalSah("9999-12-31"), false);
  assert.equal(tanggalSah("1999-12-31"), false);
  assert.equal(tanggalSah("2000-01-01"), true);
  assert.equal(tanggalSah("2100-12-31"), true);
  assert.equal(tanggalSah("2101-01-01"), false);
  assert.throws(() => rentangHari("9999-12-30", "9999-12-31"));
  assert.throws(() => rentangHari("2000-01-01", "2100-12-31"));
  assert.equal(rentangHari("2026-11-01", "2026-11-30").length, 30);
});

test("bulanSah dan tombol geser bulan menjaga batas tahun", () => {
  assert.equal(bulanSah("2026-11"), true);
  assert.equal(bulanSah("9999-12"), false);
  assert.equal(bulanSah("2026-13"), false);
  assert.equal(bulanSah("2026-1"), false);
  assert.equal(geserBulanSah("2100-12", 1), null);
  assert.equal(geserBulanSah("2000-01", -1), null);
  assert.equal(geserBulanSah("2026-12", 1), "2027-01");
});

test("lama pesanan lebih dari 366 hari ditolak", () => {
  assert.equal(galatLamaPesanan("2026-01-01", "2027-01-02"), null);
  assert.match(galatLamaPesanan("2026-01-01", "2027-01-03") ?? "", /366 hari/);
});

test("bacaRupiah membaca berbagai tulisan dan menolak yang meragukan", () => {
  for (const [masukan, hasil] of [
    ["1500000", 1_500_000],
    ["1.500.000", 1_500_000],
    ["1,500,000", 1_500_000],
    ["350.000,00", 350_000],
    ["1,500,000.50", 1_500_000],
    ["1500000.50", 1_500_000],
    ["1500000,5", 1_500_000],
    ["Rp 2.500.000", 2_500_000],
    ["1.500", 1500],
    ["0", 0],
  ] as const) {
    assert.equal(bacaRupiah(masukan), hasil, masukan);
  }
  for (const buruk of ["", "abc", "-5", "1.5.5", "1..500", "12.3456", "1.500,000", "0.500", "1,50,000", "1e9", "1.234.5", ".50", "99999999999999999999"]) {
    assert.equal(bacaRupiah(buruk), null, buruk);
  }
});
