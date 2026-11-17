import assert from "node:assert/strict";
import { test } from "node:test";

// Tidak butuh server PostgreSQL: penolakan harus terjadi sebelum ada sambungan. Alamat di bawah menunjuk port
// yang tidak melayani apa pun, jadi kalau kode mencoba tersambung, galatnya berbeda dan uji ini gagal.
process.env.MODE_DEMO = "1";
process.env.SANDI_DEMO = "sandi-demo-uji";
process.env.DATABASE_URL = "postgres://uji:uji@127.0.0.1:9/tidak_dipakai";
delete process.env.SKEMA_PG;

const { buka } = await import("../src/lib/db.ts");

const klienTersimpan = () => (globalThis as { __dbTenda?: { klien?: unknown } }).__dbTenda?.klien;

test("mode demo ditolak kalau DATABASE_URL terisi, sebelum ada sambungan ke basis data", async () => {
  await assert.rejects(buka(), /MODE_DEMO=1 tidak boleh dipakai bersama DATABASE_URL/);
  await assert.rejects(buka(), /MODE_DEMO=1 tidak boleh dipakai bersama DATABASE_URL/);
  assert.equal(klienTersimpan(), undefined);
});
