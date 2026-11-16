import assert from "node:assert/strict";
import { test } from "node:test";
import { ringkasKategori, tendaTermurah, urutKategori } from "../src/lib/kategori.ts";

const barang = [
  { kategori: "Pendingin", harga: 250_000, satuan: "unit" },
  { kategori: "Tenda", harga: 900_000, satuan: "unit" },
  { kategori: "Kursi dan meja", harga: 6_000, satuan: "buah" },
  { kategori: "Tenda", harga: 450_000, satuan: "unit" },
  { kategori: "Tenda", harga: 0, satuan: "modul" },
];

test("tenda tampil lebih dulu, kategori lain menurut abjad", () => {
  assert.deepEqual(urutKategori(barang.map((b) => b.kategori)), ["Tenda", "Kursi dan meja", "Pendingin"]);
});

test("ringkasan kategori menghitung barang dan harga termurah per kategori dalam urutan tampil", () => {
  assert.deepEqual(ringkasKategori(barang), [
    { nama: "Tenda", jumlah: 3, termurah: 450_000 },
    { nama: "Kursi dan meja", jumlah: 1, termurah: 6_000 },
    { nama: "Pendingin", jumlah: 1, termurah: 250_000 },
  ]);
  assert.deepEqual(ringkasKategori([]), []);
  // Kategori yang semua barangnya lewat penawaran tidak punya harga termurah.
  assert.deepEqual(ringkasKategori([{ kategori: "Genset", harga: 0, satuan: "unit" }]), [{ nama: "Genset", jumlah: 1, termurah: null }]);
});

test("tenda termurah mengabaikan barang tanpa harga dan kategori selain tenda", () => {
  assert.deepEqual(tendaTermurah(barang), { harga: 450_000, satuan: "unit" });
  assert.equal(tendaTermurah([{ kategori: "Kursi dan meja", harga: 6_000, satuan: "buah" }]), null);
  assert.equal(tendaTermurah([{ kategori: "Tenda", harga: 0, satuan: "unit" }]), null);
});
