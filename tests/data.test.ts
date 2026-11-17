import assert from "node:assert/strict";
import { after, test } from "node:test";

process.env.DB_PATH = ":memory:";

const { ambilPesanan, biayaBulan, bulanTerkunci, cabutSesiLain, daftarLog, daftarPesanan, galatStatus, galatUbahPesanan, lihatNilai, salinPesanan, setStatusPesanan, kekurangan, kunciBulan, labaBulan, nomorBerikut, pendapatanBulan } = await import("../src/lib/data.ts");
const { waktuKini } = await import("../src/lib/format.ts");
const { jalankan, semua: satuan, tutup } = await import("../src/lib/db.ts");

after(() => tutup());

const tenda = await jalankan("INSERT INTO aset (kode, nama, kategori, jumlah, harga) VALUES ('T1', 'Tenda', 'Tenda', 10, 1000000)");
const kontak = await jalankan("INSERT INTO kontak (nama, dibuat) VALUES ('Uji', '2026-11-01')");

async function pesanan(nomor: string, mulai: string, selesai: string, status: string, jumlah: number): Promise<number> {
  const id = await jalankan(
    "INSERT INTO pesanan (nomor, kontak_id, acara, mulai, selesai, status, dibuat) VALUES (?, ?, 'Acara', ?, ?, ?, '2026-11-01')",
    nomor, kontak, mulai, selesai, status,
  );
  await jalankan("INSERT INTO pesanan_baris (pesanan_id, aset_id, deskripsi, jumlah, hari, harga) VALUES (?, ?, 'Tenda', ?, 1, 1000000)", id, tenda, jumlah);
  return id;
}

test("booking yang bersinggungan mengurangi sisa, penawaran tidak", async () => {
  await pesanan("A", "2026-11-10", "2026-11-12", "booking", 6);
  await pesanan("B", "2026-11-11", "2026-11-11", "penawaran", 9);
  const c = await pesanan("C", "2026-11-12", "2026-11-13", "penawaran", 5);
  assert.deepEqual(await kekurangan(c), ["Tenda: butuh 5, tersedia 4"]);
  const d = await pesanan("D", "2026-11-13", "2026-11-14", "penawaran", 10);
  assert.deepEqual(await kekurangan(d), []);
});

test("unit yang diperbaiki ikut dihitung", async () => {
  const e = await pesanan("E", "2026-12-01", "2026-12-02", "penawaran", 9);
  assert.deepEqual(await kekurangan(e), []);
  await jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai) VALUES (?, 2, '2026-11-20')", tenda);
  assert.deepEqual(await kekurangan(e), ["Tenda: butuh 9, tersedia 8"]);
});

test("total, dibayar, dan sisa pesanan", async () => {
  const id = await pesanan("F", "2027-01-05", "2027-01-06", "booking", 3);
  await jalankan("UPDATE pesanan SET diskon = 500000, tgl_faktur = '2027-01-06' WHERE id = ?", id);
  await jalankan("INSERT INTO pembayaran (pesanan_id, tanggal, jumlah) VALUES (?, '2026-12-28', 1000000)", id);
  const p = (await daftarPesanan("WHERE p.id = ?", id))[0];
  assert.deepEqual([p.subtotal, p.total, p.dibayar, p.sisa], [3_000_000, 2_500_000, 1_000_000, 1_500_000]);
});

test("pendapatan basis kas memakai tanggal bayar, basis akrual memakai tanggal faktur", async () => {
  assert.equal(await pendapatanBulan("2026-12", "kas"), 1_000_000);
  assert.equal(await pendapatanBulan("2027-01", "kas"), 0);
  assert.equal(await pendapatanBulan("2027-01", "akrual"), 2_500_000);
});

test("bulan yang ditutup memakai angka beku", async () => {
  await jalankan("INSERT INTO biaya (tanggal, jenis, kategori, jumlah) VALUES ('2026-12-10', 'operasional', 'Sewa gudang', 400000)");
  assert.deepEqual(await biayaBulan("2026-12"), { langsung: 0, operasional: 400_000 });
  assert.equal((await labaBulan("2026-12")).labaBersih, 600_000);
  assert.equal(await bulanTerkunci("2026-12-15"), false);
  await kunciBulan("2026-12", "2027-01-02T00:00:00.000Z");
  assert.equal(await bulanTerkunci("2026-12-15"), true);
  await jalankan("INSERT INTO biaya (tanggal, jenis, kategori, jumlah) VALUES ('2026-12-11', 'operasional', 'Susulan', 100000)");
  const l = await labaBulan("2026-12");
  assert.deepEqual([l.labaBersih, l.bagianTenda, l.bagianHka], [600_000, 300_000, 300_000]);
});

test("nomor pesanan berurut per bulan", async () => {
  assert.equal(await nomorBerikut("2027-03-09"), "TI-2703-001");
  await jalankan("INSERT INTO pesanan (nomor, kontak_id, acara, mulai, selesai, dibuat) VALUES ('TI-2703-001', ?, 'X', '2027-03-10', '2027-03-10', '2027-03-09')", kontak);
  assert.equal(await nomorBerikut("2027-03-20"), "TI-2703-002");
});

test("hari terpadat menghitung booking dan perawatan sejak tanggal awal", async () => {
  const { hariTerpadat } = await import("../src/lib/data.ts");
  const kursi = await jalankan("INSERT INTO aset (kode, nama, kategori, jumlah, harga) VALUES ('K1', 'Kursi', 'Kursi', 5, 1000)");
  const baris = (id: number, n: number) =>
    jalankan("INSERT INTO pesanan_baris (pesanan_id, aset_id, deskripsi, jumlah, hari, harga) VALUES (?, ?, 'Kursi', ?, 1, 1000)", id, kursi, n);
  assert.equal(await hariTerpadat(kursi, "2026-12-01"), null);
  const pesan = (nomor: string, mulai: string, selesai: string, status: string) =>
    jalankan(
      "INSERT INTO pesanan (nomor, kontak_id, acara, mulai, selesai, status, dibuat) VALUES (?, ?, 'Acara', ?, ?, ?, '2026-11-01')",
      nomor, kontak, mulai, selesai, status,
    );
  await baris(await pesan("K-A", "2026-12-03", "2026-12-04", "booking"), 3);
  await baris(await pesan("K-B", "2026-12-04", "2026-12-05", "booking"), 2);
  await baris(await pesan("K-C", "2026-12-04", "2026-12-04", "penawaran"), 5);
  assert.deepEqual(await hariTerpadat(kursi, "2026-12-01"), { tanggal: "2026-12-04", jumlah: 5 });
  await jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai) VALUES (?, 1, '2026-12-02')", kursi);
  assert.deepEqual(await hariTerpadat(kursi, "2026-12-01"), { tanggal: "2026-12-04", jumlah: 6 });
  assert.equal(await hariTerpadat(kursi, "2026-12-06"), null);
});

test("jejak audit tercatat dan tidak bisa diubah atau dihapus", async () => {
  const { catatLog, daftarLog } = await import("../src/lib/data.ts");
  await catatLog({ id: 1, nama: "Penguji" }, "Catat pembayaran masuk", "TI-001, Rp 500.000");
  const bulan = (await import("../src/lib/format.ts")).hariIni().slice(0, 7);
  const [l] = await daftarLog(bulan);
  assert.equal(l.pengguna, "Penguji");
  assert.equal(l.aksi, "Catat pembayaran masuk");
  assert.match(l.waktu, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  await assert.rejects(jalankan("UPDATE log_aktivitas SET rincian = 'diubah' WHERE id = ?", l.id), /tidak bisa diubah/);
  await assert.rejects(jalankan("DELETE FROM log_aktivitas WHERE id = ?", l.id), /tidak bisa dihapus/);
});

test("unit dirawat menjumlahkan perawatan yang masih berjalan", async () => {
  const { unitDirawat } = await import("../src/lib/data.ts");
  const lampu = await jalankan("INSERT INTO aset (kode, nama, kategori, jumlah, harga) VALUES ('L1', 'Lampu', 'Lampu', 10, 1000)");
  assert.equal(await unitDirawat(lampu, "2026-12-01"), 0);
  await jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai) VALUES (?, 4, '2026-11-20')", lampu);
  await jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai, selesai) VALUES (?, 3, '2026-11-10', '2026-12-05')", lampu);
  await jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai, selesai) VALUES (?, 2, '2026-11-01', '2026-11-15')", lampu);
  assert.equal(await unitDirawat(lampu, "2026-12-01"), 7);
  assert.equal(await unitDirawat(lampu, "2026-12-06"), 4);
});

test("foto aset berurut dengan sampul lebih dulu dan ikut terhapus bersama asetnya", async () => {
  const { fotoAset, fotoPerAset } = await import("../src/lib/data.ts");
  const a = await jalankan("INSERT INTO aset (kode, nama, kategori, jumlah, harga) VALUES ('F1', 'Tenda Foto', 'Tenda', 1, 1000)");
  await jalankan("INSERT INTO aset_foto (aset_id, berkas, urutan) VALUES (?, 'a.jpg', 1)", a);
  await jalankan("INSERT INTO aset_foto (aset_id, berkas, urutan) VALUES (?, 'b.jpg', 2)", a);
  const sampul = await jalankan("INSERT INTO aset_foto (aset_id, berkas, urutan) VALUES (?, 'c.jpg', 0)", a);
  assert.deepEqual((await fotoAset(a)).map((f) => f.berkas), ["c.jpg", "a.jpg", "b.jpg"]);
  assert.equal((await fotoAset(a))[0].id, sampul);
  assert.deepEqual((await fotoPerAset()).get(a), ["c.jpg", "a.jpg", "b.jpg"]);
  await jalankan("DELETE FROM aset WHERE id = ?", a);
  assert.deepEqual(await fotoAset(a), []);
});

test("berkas foto disimpan dengan nama acak dan nama yang tidak sah tidak bisa dibaca", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "foto-uji-"));
  process.env.FOTO_DIR = dir;
  const { bacaBerkasFoto, hapusBerkasFoto, simpanBerkasFoto } = await import("../src/lib/foto.ts");
  const isi = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 0xff, 0xd9]);
  const nama = await simpanBerkasFoto(isi);
  assert.match(nama, /^[a-f0-9]{32}\.jpg$/);
  assert.deepEqual(new Uint8Array((await bacaBerkasFoto(nama))!), isi);
  assert.equal(await bacaBerkasFoto("../../etc/passwd"), null);
  assert.equal(await bacaBerkasFoto("0123456789abcdef0123456789abcdef.jpg"), null);
  await hapusBerkasFoto(nama);
  assert.equal(await bacaBerkasFoto(nama), null);
  delete process.env.FOTO_DIR;
  rmSync(dir, { recursive: true, force: true });
});

const oleh = { id: 1, nama: "Penguji" };

function isiBaris() {
  return { baris: [{ asetId: tenda, deskripsi: "Tenda", jumlah: 3, hari: 1, harga: 1_000_000 }], diskon: 0, mulai: "", selesai: "" };
}

test("pesanan tidak bisa diubah sampai total di bawah yang sudah dibayar", async () => {
  const id = await pesanan("G", "2027-02-01", "2027-02-02", "booking", 3);
  await jalankan("INSERT INTO pembayaran (pesanan_id, tanggal, jumlah) VALUES (?, '2027-01-20', 2500000)", id);
  const dasar = { ...isiBaris(), mulai: "2027-02-01", selesai: "2027-02-02" };
  assert.equal(await galatUbahPesanan(id, dasar), null);
  assert.match(await galatUbahPesanan(id, { ...dasar, diskon: 1_000_000 }) ?? "", /lebih kecil dari yang sudah dibayar/);
  assert.equal(await galatUbahPesanan(id, { ...dasar, diskon: 500_000 }), null);
});

test("sesudah faktur terbit baris, diskon, dan tanggal terkunci", async () => {
  const id = await pesanan("H", "2027-03-01", "2027-03-02", "berjalan", 3);
  await jalankan("UPDATE pesanan SET tgl_faktur = '2027-03-01' WHERE id = ?", id);
  const dasar = { ...isiBaris(), mulai: "2027-03-01", selesai: "2027-03-02" };
  assert.equal(await galatUbahPesanan(id, dasar), null);
  assert.match(await galatUbahPesanan(id, { ...dasar, diskon: 1 }) ?? "", /Faktur sudah terbit/);
  assert.match(await galatUbahPesanan(id, { ...dasar, selesai: "2027-03-03" }) ?? "", /Faktur sudah terbit/);
  assert.match(await galatUbahPesanan(id, { ...dasar, baris: [{ ...dasar.baris[0], jumlah: 4 }] }) ?? "", /Faktur sudah terbit/);
});

test("booking yang sudah dibayar tidak bisa kembali ke penawaran dan faktur dikosongkan saat kembali", async () => {
  const id = await pesanan("I", "2027-04-01", "2027-04-02", "booking", 1);
  await jalankan("UPDATE pesanan SET tgl_faktur = '2027-04-01' WHERE id = ?", id);
  await jalankan("INSERT INTO pembayaran (pesanan_id, tanggal, jumlah) VALUES (?, '2027-04-01', 100000)", id);
  assert.match(galatStatus((await ambilPesanan(id))!, "penawaran") ?? "", /sudah menerima pembayaran/);
  assert.match(galatStatus((await ambilPesanan(id))!, "batal") ?? "", /sudah menerima pembayaran/);
  await jalankan("DELETE FROM pembayaran WHERE pesanan_id = ?", id);
  assert.equal(galatStatus((await ambilPesanan(id))!, "penawaran"), null);
  await setStatusPesanan(id, "penawaran");
  assert.equal((await ambilPesanan(id))!.tgl_faktur, null);
  assert.equal((await ambilPesanan(id))!.status, "penawaran");
});

test("pendapatan akrual tidak menghitung penawaran", async () => {
  const id = await pesanan("J", "2027-05-10", "2027-05-11", "penawaran", 2);
  await jalankan("UPDATE pesanan SET tgl_faktur = '2027-05-10' WHERE id = ?", id);
  assert.equal(await pendapatanBulan("2027-05", "akrual"), 0);
  await jalankan("UPDATE pesanan SET status = 'booking' WHERE id = ?", id);
  assert.equal(await pendapatanBulan("2027-05", "akrual"), 2_000_000);
});

test("mengganti sandi sendiri mencabut sesi lain dan mempertahankan sesi saat ini", async () => {
  const u = await jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ('Uji Sesi', 'ujisesi', 'x', 'admin')");
  const lain = await jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ('Lain', 'lain', 'x', 'admin')");
  const depan = "2099-01-01T00:00:00.000Z";
  for (const [t, p] of [["saat-ini", u], ["perangkat-b", u], ["perangkat-c", u], ["milik-lain", lain]] as const) {
    await jalankan("INSERT INTO sesi (token, pengguna_id, kedaluwarsa) VALUES (?, ?, ?)", t, p, depan);
  }
  await cabutSesiLain(u, "saat-ini");
  assert.deepEqual(
    await semuaToken(),
    ["milik-lain", "saat-ini"],
  );
});

async function semuaToken(): Promise<string[]> {
  return ((await satuan("SELECT token FROM sesi ORDER BY token")) as { token: string }[]).map((r) => r.token);
}

test("duplikat pesanan mencatat jejak audit", async () => {
  const sumber = await pesanan("K", "2027-06-01", "2027-06-03", "booking", 2);
  const baru = await salinPesanan(oleh, sumber, "2027-07-01", "2027-07-03");
  const salinan = (await ambilPesanan(baru))!;
  assert.equal(salinan.status, "penawaran");
  assert.equal(salinan.total, 2_000_000);
  const log = await daftarLog(waktuKini().slice(0, 7));
  const baris = log.find((l) => l.aksi === "Salin pesanan");
  assert.ok(baris, "log salin pesanan tidak ditemukan");
  assert.match(baris.rincian, new RegExp(`${salinan.nomor} dari K`));
  assert.match(baris.rincian, /Rp 2\.000\.000/);
});

test("kunci periode memakai waktu WIB, bukan UTC", async () => {
  await kunciBulan("2026-10");
  const t = (await satuan("SELECT dikunci FROM periode WHERE bulan = '2026-10'")) as { dikunci: string }[];
  assert.match(t[0].dikunci, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
});

test("gudang melihat nilai pesanan hanya kalau dibuka di pengaturan, peran lain tidak terpengaruh", async () => {
  assert.equal(await lihatNilai("gudang"), false);
  assert.equal(await lihatNilai("sales"), true);
  await jalankan("INSERT INTO pengaturan (kunci, nilai) VALUES ('gudang_lihat_nilai', 'ya')");
  assert.equal(await lihatNilai("gudang"), true);
  assert.equal(await lihatNilai("kru"), false);
  await jalankan("UPDATE pengaturan SET nilai = 'tidak' WHERE kunci = 'gudang_lihat_nilai'");
  assert.equal(await lihatNilai("gudang"), false);
});
