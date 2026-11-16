import assert from "node:assert/strict";
import { test } from "node:test";

process.env.DB_PATH = ":memory:";

const { ambilPesanan, biayaBulan, bulanTerkunci, cabutSesiLain, daftarLog, daftarPesanan, galatStatus, galatUbahPesanan, salinPesanan, setStatusPesanan, kekurangan, kunciBulan, labaBulan, nomorBerikut, pendapatanBulan } = await import("../src/lib/data.ts");
const { waktuKini } = await import("../src/lib/format.ts");
const { jalankan, semua: satuan } = await import("../src/lib/db.ts");

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

test("foto aset berurut dengan sampul lebih dulu dan ikut terhapus bersama asetnya", async () => {
  const { fotoAset, fotoPerAset } = await import("../src/lib/data.ts");
  const a = jalankan("INSERT INTO aset (kode, nama, kategori, jumlah, harga) VALUES ('F1', 'Tenda Foto', 'Tenda', 1, 1000)");
  jalankan("INSERT INTO aset_foto (aset_id, berkas, urutan) VALUES (?, 'a.jpg', 1)", a);
  jalankan("INSERT INTO aset_foto (aset_id, berkas, urutan) VALUES (?, 'b.jpg', 2)", a);
  const sampul = jalankan("INSERT INTO aset_foto (aset_id, berkas, urutan) VALUES (?, 'c.jpg', 0)", a);
  assert.deepEqual(fotoAset(a).map((f) => f.berkas), ["c.jpg", "a.jpg", "b.jpg"]);
  assert.equal(fotoAset(a)[0].id, sampul);
  assert.deepEqual(fotoPerAset().get(a), ["c.jpg", "a.jpg", "b.jpg"]);
  jalankan("DELETE FROM aset WHERE id = ?", a);
  assert.deepEqual(fotoAset(a), []);
});

test("berkas foto disimpan dengan nama acak dan nama yang tidak sah tidak bisa dibaca", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "foto-uji-"));
  process.env.FOTO_DIR = dir;
  const { bacaBerkasFoto, hapusBerkasFoto, simpanBerkasFoto } = await import("../src/lib/foto.ts");
  const isi = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 0xff, 0xd9]);
  const nama = simpanBerkasFoto(isi);
  assert.match(nama, /^[a-f0-9]{32}\.jpg$/);
  assert.deepEqual(new Uint8Array(bacaBerkasFoto(nama)!), isi);
  assert.equal(bacaBerkasFoto("../../etc/passwd"), null);
  assert.equal(bacaBerkasFoto("0123456789abcdef0123456789abcdef.jpg"), null);
  hapusBerkasFoto(nama);
  assert.equal(bacaBerkasFoto(nama), null);
  delete process.env.FOTO_DIR;
  rmSync(dir, { recursive: true, force: true });
});

const oleh = { id: 1, nama: "Penguji" };

function isiBaris() {
  return { baris: [{ asetId: tenda, deskripsi: "Tenda", jumlah: 3, hari: 1, harga: 1_000_000 }], diskon: 0, mulai: "", selesai: "" };
}

test("pesanan tidak bisa diubah sampai total di bawah yang sudah dibayar", () => {
  const id = pesanan("G", "2027-02-01", "2027-02-02", "booking", 3);
  jalankan("INSERT INTO pembayaran (pesanan_id, tanggal, jumlah) VALUES (?, '2027-01-20', 2500000)", id);
  const dasar = { ...isiBaris(), mulai: "2027-02-01", selesai: "2027-02-02" };
  assert.equal(galatUbahPesanan(id, dasar), null);
  assert.match(galatUbahPesanan(id, { ...dasar, diskon: 1_000_000 }) ?? "", /lebih kecil dari yang sudah dibayar/);
  assert.equal(galatUbahPesanan(id, { ...dasar, diskon: 500_000 }), null);
});

test("sesudah faktur terbit baris, diskon, dan tanggal terkunci", () => {
  const id = pesanan("H", "2027-03-01", "2027-03-02", "berjalan", 3);
  jalankan("UPDATE pesanan SET tgl_faktur = '2027-03-01' WHERE id = ?", id);
  const dasar = { ...isiBaris(), mulai: "2027-03-01", selesai: "2027-03-02" };
  assert.equal(galatUbahPesanan(id, dasar), null);
  assert.match(galatUbahPesanan(id, { ...dasar, diskon: 1 }) ?? "", /Faktur sudah terbit/);
  assert.match(galatUbahPesanan(id, { ...dasar, selesai: "2027-03-03" }) ?? "", /Faktur sudah terbit/);
  assert.match(galatUbahPesanan(id, { ...dasar, baris: [{ ...dasar.baris[0], jumlah: 4 }] }) ?? "", /Faktur sudah terbit/);
});

test("booking yang sudah dibayar tidak bisa kembali ke penawaran dan faktur dikosongkan saat kembali", () => {
  const id = pesanan("I", "2027-04-01", "2027-04-02", "booking", 1);
  jalankan("UPDATE pesanan SET tgl_faktur = '2027-04-01' WHERE id = ?", id);
  jalankan("INSERT INTO pembayaran (pesanan_id, tanggal, jumlah) VALUES (?, '2027-04-01', 100000)", id);
  assert.match(galatStatus(ambilPesanan(id)!, "penawaran") ?? "", /sudah menerima pembayaran/);
  assert.match(galatStatus(ambilPesanan(id)!, "batal") ?? "", /sudah menerima pembayaran/);
  jalankan("DELETE FROM pembayaran WHERE pesanan_id = ?", id);
  assert.equal(galatStatus(ambilPesanan(id)!, "penawaran"), null);
  setStatusPesanan(id, "penawaran");
  assert.equal(ambilPesanan(id)!.tgl_faktur, null);
  assert.equal(ambilPesanan(id)!.status, "penawaran");
});

test("pendapatan akrual tidak menghitung penawaran", () => {
  const id = pesanan("J", "2027-05-10", "2027-05-11", "penawaran", 2);
  jalankan("UPDATE pesanan SET tgl_faktur = '2027-05-10' WHERE id = ?", id);
  assert.equal(pendapatanBulan("2027-05", "akrual"), 0);
  jalankan("UPDATE pesanan SET status = 'booking' WHERE id = ?", id);
  assert.equal(pendapatanBulan("2027-05", "akrual"), 2_000_000);
});

test("mengganti sandi sendiri mencabut sesi lain dan mempertahankan sesi saat ini", () => {
  const u = jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ('Uji Sesi', 'ujisesi', 'x', 'admin')");
  const lain = jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ('Lain', 'lain', 'x', 'admin')");
  const depan = "2099-01-01T00:00:00.000Z";
  for (const [t, p] of [["saat-ini", u], ["perangkat-b", u], ["perangkat-c", u], ["milik-lain", lain]] as const) {
    jalankan("INSERT INTO sesi (token, pengguna_id, kedaluwarsa) VALUES (?, ?, ?)", t, p, depan);
  }
  cabutSesiLain(u, "saat-ini");
  assert.deepEqual(
    semuaToken(),
    ["milik-lain", "saat-ini"],
  );
});

function semuaToken(): string[] {
  return (satuan("SELECT token FROM sesi ORDER BY token") as { token: string }[]).map((r) => r.token);
}

test("duplikat pesanan mencatat jejak audit", () => {
  const sumber = pesanan("K", "2027-06-01", "2027-06-03", "booking", 2);
  const baru = salinPesanan(oleh, sumber, "2027-07-01", "2027-07-03");
  const salinan = ambilPesanan(baru)!;
  assert.equal(salinan.status, "penawaran");
  assert.equal(salinan.total, 2_000_000);
  const log = daftarLog(waktuKini().slice(0, 7));
  const baris = log.find((l) => l.aksi === "Salin pesanan");
  assert.ok(baris, "log salin pesanan tidak ditemukan");
  assert.match(baris.rincian, new RegExp(`${salinan.nomor} dari K`));
  assert.match(baris.rincian, /Rp 2\.000\.000/);
});

test("kunci periode memakai waktu WIB, bukan UTC", () => {
  kunciBulan("2026-10");
  const t = satuan("SELECT dikunci FROM periode WHERE bulan = '2026-10'") as { dikunci: string }[];
  assert.match(t[0].dikunci, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});
