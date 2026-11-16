// Daftar foto bawaan di public/katalog beserta pembuat dan lisensinya. Disusun dari sumber.json hasil pemeriksaan foto.
// Semua foto ini foto ilustrasi dari pihak lain, bukan dokumentasi acara Tenda Indonesia.
export type KreditFoto = {
  berkas: string;
  barang: string;
  pembuat: string;
  lisensi: string;
  halaman: string;
};

const PEXELS = "Pexels License";

export const KREDIT_FOTO: KreditFoto[] = [
  { berkas: "katalog/02-sarnafil-5x5.jpg", barang: "Tenda Sarnafil 5x5 m dan 3x3 m", pembuat: "Tito Zzzz", lisensi: PEXELS, halaman: "https://www.pexels.com/photo/29995960/" },
  { berkas: "katalog/03-roder.jpg", barang: "Tenda Roder", pembuat: "David Yu", lisensi: PEXELS, halaman: "https://www.pexels.com/photo/9473070/" },
  { berkas: "katalog/04-dekorasi.jpg", barang: "Tenda Dekorasi", pembuat: "MunozPhoto_", lisensi: PEXELS, halaman: "https://www.pexels.com/photo/19024675/" },
  { berkas: "katalog/06-kursi.jpg", barang: "Kursi Futura", pembuat: "NEOSiAM 18+", lisensi: PEXELS, halaman: "https://www.pexels.com/photo/39390831/" },
  { berkas: "katalog/07-meja-bundar.jpg", barang: "Meja Bundar", pembuat: "Vidal Balielo Jr.", lisensi: PEXELS, halaman: "https://www.pexels.com/photo/3376765/" },
  { berkas: "katalog/09-kipas-kabut.jpg", barang: "Kipas Kabut", pembuat: "Ayşegül", lisensi: PEXELS, halaman: "https://www.pexels.com/photo/33551687/" },
  { berkas: "katalog/10-lampu-sorot.jpg", barang: "Lampu Sorot LED", pembuat: "Francesco Paggiaro", lisensi: PEXELS, halaman: "https://www.pexels.com/photo/1585376/" },
  { berkas: "katalog/11-hero.jpg", barang: "Foto utama di beranda", pembuat: "Sydney Sang", lisensi: PEXELS, halaman: "https://www.pexels.com/photo/28937190/" },
];

// Foto bawaan yang dipasang ke aset contoh: kode aset lalu nama berkas.
export const FOTO_ASET_CONTOH: Record<string, string> = {
  "TS-33": "katalog/01-sarnafil-3x3.jpg",
  "TS-55": "katalog/02-sarnafil-5x5.jpg",
  "TR-10": "katalog/03-roder.jpg",
  "TD-46": "katalog/04-dekorasi.jpg",
  "KS-01": "katalog/06-kursi.jpg",
  "MJ-01": "katalog/07-meja-bundar.jpg",
  "KP-01": "katalog/09-kipas-kabut.jpg",
  "LP-01": "katalog/10-lampu-sorot.jpg",
};
