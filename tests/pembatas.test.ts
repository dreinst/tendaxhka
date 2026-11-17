import assert from "node:assert/strict";
import { after, test } from "node:test";
import { siapkanBasisUji } from "./basis-uji.ts";

const buang = siapkanBasisUji(":memory:");

const { batasMasuk, bersihkanPembatas, catatPercobaan, catatPerangkat, hitungan, JENDELA_MASUK, lupakanPerangkat, lupakanPercobaan, melewatiBatas, perangkatMilik } = await import("../src/lib/pembatas.ts");
const { jalankan, semua, sisip, tutup } = await import("../src/lib/db.ts");

after(async () => {
  await tutup();
  await buang();
});

const MENIT = 60_000;
const T0 = Date.parse("2026-11-17T03:00:00Z");

test("hitungan bertambah di dalam jendela dan mulai lagi dari satu sesudah jendela lewat", async () => {
  assert.equal(await hitungan("a", 15, T0), 0);
  await catatPercobaan("a", 15, T0);
  await catatPercobaan("a", 15, T0 + 5 * MENIT);
  await catatPercobaan("a", 15, T0 + 14 * MENIT);
  assert.equal(await hitungan("a", 15, T0 + 14 * MENIT), 3);
  // Jendela dihitung sejak percobaan pertama, bukan sejak yang terakhir.
  assert.equal(await hitungan("a", 15, T0 + 15 * MENIT), 0);
  await catatPercobaan("a", 15, T0 + 16 * MENIT);
  assert.equal(await hitungan("a", 15, T0 + 16 * MENIT), 1);
  assert.equal(await hitungan("lain", 15, T0), 0);
});

test("tanpa alamat tidak ada hitungan bersama, jadi satu orang tidak bisa menutup halaman masuk untuk semua akun", async () => {
  const batas = batasMasuk(null, "admin", null);
  assert.deepEqual(batas.map((b) => b.kunci), ["masuk-akun|admin"]);
  for (let i = 0; i < 100; i++) for (const b of batasMasuk(null, `tebak${i}`, null)) await catatPercobaan(b.kunci, JENDELA_MASUK, T0);
  assert.equal(await melewatiBatas(batasMasuk(null, "sales", null), JENDELA_MASUK, T0), false);
  assert.equal(await melewatiBatas(batasMasuk(null, "tebak1", null), JENDELA_MASUK, T0), false);
});

test("jatah username yang dihabiskan perangkat asing tidak mengunci perangkat yang dikenal", async () => {
  const asing = batasMasuk(null, "gudang", null);
  for (let i = 0; i < 10; i++) for (const b of asing) await catatPercobaan(b.kunci, JENDELA_MASUK, T0);
  assert.equal(await melewatiBatas(asing, JENDELA_MASUK, T0), true);
  const dikenal = batasMasuk(null, "gudang", "f".repeat(64));
  assert.equal(await melewatiBatas(dikenal, JENDELA_MASUK, T0), false);
  // Perangkat yang dikenal tetap punya batasnya sendiri, per akun.
  for (let i = 0; i < 10; i++) for (const b of dikenal) await catatPercobaan(b.kunci, JENDELA_MASUK, T0);
  assert.equal(await melewatiBatas(dikenal, JENDELA_MASUK, T0), true);
  assert.equal(await melewatiBatas(batasMasuk(null, "kru", "f".repeat(64)), JENDELA_MASUK, T0), false);
  // Sesudah jendela lewat semuanya terbuka lagi.
  assert.equal(await melewatiBatas(asing, JENDELA_MASUK, T0 + 15 * MENIT), false);
});

test("dengan alamat: lima kali per akun, dua puluh kali per alamat, dan hitungan alamat tidak ikut dihapus", async () => {
  const ip = "203.0.113.7";
  const batas = batasMasuk(ip, "partner", null);
  assert.deepEqual(batas.map((b) => [b.kunci, b.maks, b.lupakan]), [
    [`masuk|${ip}|partner`, 5, true],
    [`masuk-ip|${ip}`, 20, false],
    ["masuk-akun|partner", 10, true],
  ]);
  for (let i = 0; i < 5; i++) for (const b of batas) await catatPercobaan(b.kunci, JENDELA_MASUK, T0);
  assert.equal(await melewatiBatas(batas, JENDELA_MASUK, T0), true);
  // Alamat lain dan akun lain dari alamat yang sama belum terkena.
  assert.equal(await melewatiBatas(batasMasuk("203.0.113.8", "partner", null), JENDELA_MASUK, T0), false);
  assert.equal(await melewatiBatas(batasMasuk(ip, "lainnya", null), JENDELA_MASUK, T0), false);
  await lupakanPercobaan(batas.filter((b) => b.lupakan).map((b) => b.kunci));
  assert.equal(await hitungan(`masuk|${ip}|partner`, JENDELA_MASUK, T0), 0);
  assert.equal(await hitungan(`masuk-ip|${ip}`, JENDELA_MASUK, T0), 5);
});

test("perangkat dikenal hanya untuk akun yang pernah masuk darinya, selama belum kedaluwarsa dan akunnya aktif", async () => {
  const a = await sisip("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ('A', 'akun-a', 'x', 'sales')");
  const b = await sisip("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ('B', 'akun-b', 'x', 'gudang')");
  const hash = "c".repeat(64);
  const habis = new Date(T0 + 90 * 864e5);
  await catatPerangkat(hash, a, habis);
  assert.equal(await perangkatMilik(hash, "akun-a", T0), true);
  assert.equal(await perangkatMilik(hash, "akun-b", T0), false);
  assert.equal(await perangkatMilik("d".repeat(64), "akun-a", T0), false);
  // Komputer bersama: akun kedua masuk dari perangkat yang sama, akun pertama tetap dikenal.
  await catatPerangkat(hash, b, habis);
  assert.equal(await perangkatMilik(hash, "akun-a", T0), true);
  assert.equal(await perangkatMilik(hash, "akun-b", T0), true);
  // Masuk lagi hanya memperpanjang, tidak menambah baris.
  await catatPerangkat(hash, a, new Date(T0 + 120 * 864e5));
  assert.equal((await semua("SELECT 1 FROM perangkat WHERE token = ?", hash)).length, 2);
  assert.equal(await perangkatMilik(hash, "akun-b", T0 + 91 * 864e5), false);
  assert.equal(await perangkatMilik(hash, "akun-a", T0 + 91 * 864e5), true);
  await jalankan("UPDATE pengguna SET aktif = 0 WHERE id = ?", a);
  assert.equal(await perangkatMilik(hash, "akun-a", T0), false);
  await lupakanPerangkat(b);
  assert.equal(await perangkatMilik(hash, "akun-b", T0), false);
});

test("hitungan lama dan perangkat kedaluwarsa dibuang", async () => {
  const u = await sisip("INSERT INTO pengguna (nama, username, sandi, peran) VALUES ('C', 'akun-c', 'x', 'kru')");
  await catatPercobaan("lama", 15, T0 - 25 * 3600_000);
  await catatPercobaan("baru", 15, T0 - 3600_000);
  await catatPerangkat("1".repeat(64), u, new Date(T0 - 1000));
  await catatPerangkat("2".repeat(64), u, new Date(T0 + 1000));
  await bersihkanPembatas(T0);
  const kunci = ((await semua("SELECT kunci FROM pembatas WHERE kunci IN ('lama', 'baru')")) as { kunci: string }[]).map((b) => b.kunci);
  assert.deepEqual(kunci, ["baru"]);
  const token = ((await semua("SELECT token FROM perangkat WHERE pengguna_id = ?", u)) as { token: string }[]).map((b) => b.token);
  assert.deepEqual(token, ["2".repeat(64)]);
});
