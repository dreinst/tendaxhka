import assert from "node:assert/strict";
import { test } from "node:test";
import { bacaSesiDemo, MAKS_UMUR_SESI_DEMO, tokenSesiDemo, turunkanRahasiaDemo } from "../src/lib/sandi.ts";

test("rahasia demo menolak kata sandi pendek", () => {
  assert.throws(() => turunkanRahasiaDemo(""), /minimal 8 karakter/);
  assert.throws(() => turunkanRahasiaDemo("1234567"), /minimal 8 karakter/);
  assert.match(turunkanRahasiaDemo("12345678"), /^[a-f0-9]{64}$/);
});

test("sesi demo ditolak kalau masa berlakunya lebih dari 12 jam dari sekarang", () => {
  const rahasia = turunkanRahasiaDemo("sandi-demo-uji");
  const kini = 1_800_000_000_000;
  assert.equal(bacaSesiDemo(tokenSesiDemo("admin", kini + 3600_000, rahasia), rahasia, kini), "admin");
  assert.equal(bacaSesiDemo(tokenSesiDemo("admin", kini + MAKS_UMUR_SESI_DEMO, rahasia), rahasia, kini), "admin");
  assert.equal(bacaSesiDemo(tokenSesiDemo("admin", kini + MAKS_UMUR_SESI_DEMO + 1, rahasia), rahasia, kini), null);
  assert.equal(bacaSesiDemo(tokenSesiDemo("admin", kini + 365 * 864e5, rahasia), rahasia, kini), null);
  assert.equal(bacaSesiDemo(tokenSesiDemo("admin", kini - 1, rahasia), rahasia, kini), null);
});
