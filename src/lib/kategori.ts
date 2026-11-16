// Urutan kategori di website: tenda lebih dulu, kategori lain menurut abjad.
export function urutKategori(daftar: string[]): string[] {
  const tenda = (k: string) => Number(k.toLowerCase().includes("tenda"));
  return [...new Set(daftar)].sort((a, b) => tenda(b) - tenda(a) || a.localeCompare(b));
}

type Butir = { kategori: string; harga: number; satuan: string };

// Harga terendah di antara barang yang harganya tertulis. Barang tanpa harga (harganya lewat penawaran) dilewati.
function termurah(barang: Butir[]): Butir | null {
  const berharga = barang.filter((b) => b.harga > 0);
  return berharga.length ? berharga.reduce((a, b) => (b.harga < a.harga ? b : a)) : null;
}

// Jumlah barang dan harga termurah per kategori, dalam urutan tampil di website. Dipakai pita kategori di beranda.
export function ringkasKategori(barang: Butir[]): { nama: string; jumlah: number; termurah: number | null }[] {
  return urutKategori(barang.map((b) => b.kategori)).map((nama) => {
    const isi = barang.filter((b) => b.kategori === nama);
    return { nama, jumlah: isi.length, termurah: termurah(isi)?.harga ?? null };
  });
}

// Harga sewa tenda paling rendah yang tertulis di katalog, untuk label "mulai" di foto beranda.
export function tendaTermurah(barang: Butir[]): { harga: number; satuan: string } | null {
  const t = termurah(barang.filter((b) => b.kategori.toLowerCase().includes("tenda")));
  return t && { harga: t.harga, satuan: t.satuan };
}
