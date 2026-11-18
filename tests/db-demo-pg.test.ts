import assert from "node:assert/strict";
import { after, test } from "node:test";
import { PG, siapkanBasisUji } from "./basis-uji.ts";

// Mode demo di atas PostgreSQL: data contoh menetap di basis data itu dan hanya diisi sekali. Uji ini butuh
// PostgreSQL, jadi dilewati di npm test dan jalan di npm run test:pg.
process.env.MODE_DEMO = "1";
process.env.SANDI_DEMO = "sandi-demo-uji";
const buangSkema = siapkanBasisUji(":memory:");

const { buka, satu, tutup } = await import("../src/lib/db.ts");

after(async () => {
  await tutup();
  await buangSkema();
});

const jumlah = async (tabel: string) => (await satu<{ n: number }>(`SELECT COUNT(*) AS n FROM ${tabel}`))!.n;

test("mode demo mengisi data contoh ke PostgreSQL yang masih kosong", { skip: !PG }, async () => {
  assert.equal((await buka()).jenis, "postgres");
  assert.equal(await jumlah("pengguna"), 6);
  assert.ok((await jumlah("aset")) >= 10);
  assert.ok((await jumlah("pesanan")) > 0);
});

test("server lain yang bangun sesudahnya tidak mengisi ulang data contoh", { skip: !PG }, async () => {
  const pengguna = await jumlah("pengguna");
  const pesanan = await jumlah("pesanan");
  // Menutup lalu membuka lagi sama dengan server baru yang tersambung ke basis data yang sudah terisi.
  await tutup();
  await buka();
  assert.equal(await jumlah("pengguna"), pengguna);
  assert.equal(await jumlah("pesanan"), pesanan);
});
