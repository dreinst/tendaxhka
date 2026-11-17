import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const folder = mkdtempSync(join(tmpdir(), "tenda-uji-demo-jauh-"));
const berkas = join(folder, "asli.db");
process.env.MODE_DEMO = "1";
process.env.SANDI_DEMO = "sandi-demo-uji";
process.env.TURSO_DATABASE_URL = `file:${berkas}`;

const { buka } = await import("../src/lib/db.ts");

after(() => rmSync(folder, { recursive: true, force: true }));

test("mode demo ditolak kalau basis data asli terpasang, sebelum ada yang ditulis ke sana", async () => {
  await assert.rejects(buka(), /MODE_DEMO=1 tidak boleh dipakai bersama TURSO_DATABASE_URL/);
  await assert.rejects(buka(), /MODE_DEMO=1 tidak boleh dipakai bersama TURSO_DATABASE_URL/);
  assert.equal(existsSync(berkas), false);
});
