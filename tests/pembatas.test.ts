import assert from "node:assert/strict";
import { test } from "node:test";

process.env.DB_PATH = ":memory:";

const { batasMasuk, bersihkanPembatas, catatPercobaan, catatPerangkat, hitungan, JENDELA_MASUK, lupakanPerangkat, lupakanPercobaan, melewatiBatas, perangkatMilik } = await import("../src/lib/pembatas.ts");
const { jalankan, semua } = await import("../src/lib/db.ts");

const MENIT = 60_000;
const T0 = Date.parse("2026-11-17T03:00:00Z");

test("hitungan bertambah di dalam jendela dan mulai lagi dari satu sesudah jendela lewat", () => {
  assert.equal(hitungan("a", 15, T0), 0);
  catatPercobaan("a", 15, T0);
  catatPercobaan("a", 15, T0 + 5 * MENIT);
  catatPercobaan("a", 15, T0 + 14 * MENIT);
  assert.equal(hitungan("a", 15, T0 + 14 * MENIT), 3);
  // Jendela dihitung sejak percobaan pertama, bukan sejak yang terakhir.
  assert.equal(hitungan("a", 15, T0 + 15 * MENIT), 0);
  catatPercobaan("a", 15, T0 + 16 * MENIT);
  assert.equal(hitungan("a", 15, T0 + 16 * MENIT), 1);
  assert.equal(hitungan("lain", 15, T0), 0);
});

test("tanpa alamat tidak ada hitungan bersama, jadi satu orang tidak bisa menutup halaman masuk untuk semua akun", () => {
  const batas = batasMasuk(null, "admin", null);
  assert.deepEqual(batas.map((b) => b.kunci), ["masuk-akun|admin"]);
  for (let i = 0; i < 100; i++) for (const b of batasMasuk(null, `tebak${i}`, null)) catatPercobaan(b.kunci, JENDELA_MASUK, T0);
  assert.equal(melewatiBatas(batasMasuk(null, "sales", null), JENDELA_MASUK, T0), false);
  assert.equal(melewatiBatas(batasMasuk(null, "tebak1", null), JENDELA_MASUK, T0), false);
});

test("jatah username yang dihabiskan perangkat asing tidak mengunci perangkat yang dikenal", () => {
  const asing = batasMasuk(null, "gudang", null);
  for (let i = 0; i < 10; i++) for (const b of asing) catatPercobaan(b.kunci, JENDELA_MASUK, T0);
  assert.equal(melewatiBatas(asing, JENDELA_MASUK, T0), true);
  const dikenal = batasMasuk(null, "gudang", "f".repeat(64));
  assert.equal(melewatiBatas(dikenal, JENDELA_MASUK, T0), false);
  // Perangkat yang dikenal tetap punya batasnya sendiri, per akun.
  for (let i = 0; i < 10; i++) for (const b of dikenal) catatPercobaan(b.kunci, JENDELA_MASUK, T0);
  assert.equal(melewatiBatas(dikenal, JENDELA_MASUK, T0), true);
  assert.equal(melewatiBatas(batasMasuk(null, "kru", "f".repeat(64)), JENDELA_MASUK, T0), false);
  // Sesudah jendela lewat semuanya terbuka lagi.
  assert.equal(melewatiBatas(asing, JENDELA_MASUK, T0 + 15 * MENIT), false);
});

test("dengan alamat: lima kali per akun, dua puluh kali per alamat, dan hitungan alamat tidak ikut dihapus", () => {
  const ip = "203.0.113.7";
  const batas = batasMasuk(ip, "partner", null);
  assert.deepEqual(batas.map((b) => [b.kunci, b.maks, b.lupakan]), [
    [`masuk|${ip}|partner`, 5, true],
    [`masuk-ip|${ip}`, 20, false],
    ["masuk-akun|partner", 10, true],
  ]);
  for (let i = 0; i < 5; i++) for (const b of batas) catatPercobaan(b.kunci, JENDELA_MASUK, T0);
  assert.equal(melewatiBatas(batas, JENDELA_MASUK, T0), true);
  // Alamat lain dan akun lain dari alamat yang sama belum terkena.
  assert.equal(melewatiBatas(batasMasuk("203.0.113.8", "partner", null), JENDELA_MASUK, T0), false);
  assert.equal(melewatiBatas(batasMasuk(ip, "lainnya", null), JENDELA_MASUK, T0), false);
  lupakanPercobaan(batas.filter((b) => b.lupakan).map((b) => b.kunci));
  assert.equal(hitungan(`masuk|${ip}|partner`, JENDELA_MASUK, T0), 0);
  assert.equal(hitungan(`masuk-ip|${ip}`, JENDELA_MASUK, T0), 5);
});

test("perangkat dikenal hanya untuk akun yang pernah masuk darinya, selama belum kedaluwarsa dan akunnya aktif", () => {
  const a = jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ('A', 'akun-a', 'x', 'sales')");
  const b = jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ('B', 'akun-b', 'x', 'gudang')");
  const hash = "c".repeat(64);
  const habis = new Date(T0 + 90 * 864e5);
  catatPerangkat(hash, a, habis);
  assert.equal(perangkatMilik(hash, "akun-a", T0), true);
  assert.equal(perangkatMilik(hash, "akun-b", T0), false);
  assert.equal(perangkatMilik("d".repeat(64), "akun-a", T0), false);
  // Komputer bersama: akun kedua masuk dari perangkat yang sama, akun pertama tetap dikenal.
  catatPerangkat(hash, b, habis);
  assert.equal(perangkatMilik(hash, "akun-a", T0), true);
  assert.equal(perangkatMilik(hash, "akun-b", T0), true);
  // Masuk lagi hanya memperpanjang, tidak menambah baris.
  catatPerangkat(hash, a, new Date(T0 + 120 * 864e5));
  assert.equal(semua("SELECT 1 FROM perangkat WHERE token = ?", hash).length, 2);
  assert.equal(perangkatMilik(hash, "akun-b", T0 + 91 * 864e5), false);
  assert.equal(perangkatMilik(hash, "akun-a", T0 + 91 * 864e5), true);
  jalankan("UPDATE pengguna SET aktif = 0 WHERE id = ?", a);
  assert.equal(perangkatMilik(hash, "akun-a", T0), false);
  lupakanPerangkat(b);
  assert.equal(perangkatMilik(hash, "akun-b", T0), false);
});

test("hitungan lama dan perangkat kedaluwarsa dibuang", () => {
  const u = jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ('C', 'akun-c', 'x', 'kru')");
  catatPercobaan("lama", 15, T0 - 25 * 3600_000);
  catatPercobaan("baru", 15, T0 - 3600_000);
  catatPerangkat("1".repeat(64), u, new Date(T0 - 1000));
  catatPerangkat("2".repeat(64), u, new Date(T0 + 1000));
  bersihkanPembatas(T0);
  const kunci = (semua("SELECT kunci FROM pembatas WHERE kunci IN ('lama', 'baru')") as { kunci: string }[]).map((b) => b.kunci);
  assert.deepEqual(kunci, ["baru"]);
  const token = (semua("SELECT token FROM perangkat WHERE pengguna_id = ?", u) as { token: string }[]).map((b) => b.token);
  assert.deepEqual(token, ["2".repeat(64)]);
});
