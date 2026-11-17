import type { Barang } from "@/komponen/katalog";
import { fotoPerAset, pengaturan, type Aset } from "./data.ts";
import { semua } from "./db.ts";
import { nomorWa } from "./hitung.ts";

// Barang yang tampil di website. Hanya kolom untuk pengunjung yang dikirim ke browser, jumlah stok tidak ikut.
export async function barangKatalog(): Promise<Barang[]> {
  const [foto, aset] = await Promise.all([
    fotoPerAset(),
    semua<Aset>("SELECT * FROM aset WHERE aktif = 1 AND tampil_web = 1 ORDER BY kategori, harga DESC"),
  ]);
  return aset.map((a) => ({
    id: a.id,
    nama: a.nama,
    ukuran: a.ukuran,
    kategori: a.kategori,
    satuan: a.satuan,
    harga: a.harga,
    deskripsi: a.deskripsi,
    kapasitas: a.kapasitas,
    cocok: a.cocok,
    foto: foto.get(a.id) ?? [],
  }));
}

// Identitas usaha dan kontak yang dipakai kepala, kaki, dan tombol WhatsApp di semua halaman publik.
export async function identitasSitus() {
  const s = await pengaturan();
  // Nomor WhatsApp khusus dipakai lebih dulu, lalu nomor telepon. Tanpa nomor seluler yang sah, tombol tidak tampil.
  const wa = nomorWa(s.whatsapp) ?? nomorWa(s.telepon);
  return { s, wa, sapa: `Halo ${s.nama_usaha}, saya ingin tanya sewa tenda.` };
}
