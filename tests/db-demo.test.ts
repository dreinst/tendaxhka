import assert from "node:assert/strict";
import { test } from "node:test";

process.env.MODE_DEMO = "1";
process.env.DB_PATH = ":memory:";
delete process.env.SANDI_DEMO;

const { db } = await import("../src/lib/db.ts");

test("mode demo tanpa SANDI_DEMO gagal di setiap pemanggilan, bukan hanya yang pertama", () => {
  assert.throws(() => db(), /SANDI_DEMO/);
  assert.throws(() => db(), /SANDI_DEMO/);
  assert.equal((globalThis as { __dbTenda?: unknown }).__dbTenda, undefined);
});

test("mode demo dengan SANDI_DEMO sah mengisi data contoh dan memakai koneksi yang sama", () => {
  process.env.SANDI_DEMO = "sandi-demo-uji";
  const a = db();
  assert.ok(a.prepare("SELECT 1 FROM pengguna LIMIT 1").get());
  assert.equal(db(), a);
});
