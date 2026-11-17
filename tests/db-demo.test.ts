import assert from "node:assert/strict";
import { after, test } from "node:test";

process.env.MODE_DEMO = "1";
process.env.DB_PATH = ":memory:";
delete process.env.SANDI_DEMO;

const { buka, satu, tutup } = await import("../src/lib/db.ts");

after(() => tutup());

const klienTersimpan = () => (globalThis as { __dbTenda?: { klien?: unknown } }).__dbTenda?.klien;

test("mode demo tanpa SANDI_DEMO gagal di setiap pemanggilan, bukan hanya yang pertama", async () => {
  await assert.rejects(buka(), /SANDI_DEMO/);
  await assert.rejects(buka(), /SANDI_DEMO/);
  assert.equal(klienTersimpan(), undefined);
});

test("mode demo dengan SANDI_DEMO sah mengisi data contoh dan memakai klien yang sama", async () => {
  process.env.SANDI_DEMO = "sandi-demo-uji";
  const a = await buka();
  assert.ok(await satu("SELECT 1 FROM pengguna LIMIT 1"));
  assert.equal(await buka(), a);
});
