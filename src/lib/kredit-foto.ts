// Daftar foto bawaan di public/katalog beserta pembuat dan lisensinya. Semua foto ini foto ilustrasi karya pihak
// lain, diambil dari Pexels dalam ukuran HD (sisi terpanjang 1920 piksel). Lisensi Pexels tidak mewajibkan
// penyebutan pembuat, tetapi tetap dicantumkan di halaman kredit. Kalau nanti memakai foto berlisensi Creative
// Commons, pembuat, tautan lisensi, dan keterangan ubahannya wajib lengkap.
export type KreditFoto = {
  berkas: string;
  barang: string;
  pembuat: string;
  lisensi: string;
  tautanLisensi: string;
  halaman: string;
  ubahan: string;
};

const PEXELS = { lisensi: "Lisensi Pexels", tautanLisensi: "https://www.pexels.com/license/", ubahan: "Diperkecil" };

export const KREDIT_FOTO: KreditFoto[] = [
  { berkas: "katalog/21-hero-halaman.jpg", barang: "Foto utama di beranda", pembuat: "The Visionary Vows", halaman: "https://www.pexels.com/photo/32854452/", ...PEXELS },
  { berkas: "katalog/16-puncak-tenda.jpg", barang: "Puncak tenda di beranda", pembuat: "Jan van der Wolf", halaman: "https://www.pexels.com/photo/27952757/", ...PEXELS },
  { berkas: "katalog/13-dalam-tenda.jpg", barang: "Bagian dalam tenda di beranda", pembuat: "Masood Aslami", halaman: "https://www.pexels.com/photo/33115768/", ...PEXELS },
  { berkas: "katalog/15-terpasang.jpg", barang: "Tenda terpasang di bagian cara sewa dan katalog", pembuat: "Jonathan Borba", halaman: "https://www.pexels.com/photo/37958066/", ...PEXELS },
  { berkas: "katalog/03b-roder.jpg", barang: "Tenda Roder", pembuat: "Sean P. Twomey", halaman: "https://www.pexels.com/photo/14184785/", ...PEXELS, ubahan: "Dipotong ke bagian tendanya dan diperkecil" },
  { berkas: "katalog/22-sarnafil-5x5.jpg", barang: "Tenda Sarnafil 5x5 m", pembuat: "Sydney Sang", halaman: "https://www.pexels.com/photo/28937190/", ...PEXELS },
  { berkas: "katalog/01-sarnafil-3x3.jpg", barang: "Tenda Sarnafil 3x3 m", pembuat: "Tito Zzzz", halaman: "https://www.pexels.com/photo/29995960/", ...PEXELS },
  { berkas: "katalog/04-dekorasi.jpg", barang: "Tenda Dekorasi", pembuat: "MunozPhoto_", halaman: "https://www.pexels.com/photo/19024675/", ...PEXELS },
  { berkas: "katalog/05-panggung.jpg", barang: "Lantai Panggung", pembuat: "Cưới Hỏi Hồng Biên", halaman: "https://www.pexels.com/photo/39204572/", ...PEXELS, ubahan: "Dipotong ke bagian panggungnya dan diperkecil" },
  { berkas: "katalog/06-kursi.jpg", barang: "Kursi Futura", pembuat: "NEOSiAM 18+", halaman: "https://www.pexels.com/photo/39390831/", ...PEXELS },
  { berkas: "katalog/07-meja-bundar.jpg", barang: "Meja Bundar", pembuat: "Vidal Balielo Jr.", halaman: "https://www.pexels.com/photo/3376765/", ...PEXELS },
  { berkas: "katalog/09-kipas-kabut.jpg", barang: "Kipas Kabut", pembuat: "Ayşegül", halaman: "https://www.pexels.com/photo/33551687/", ...PEXELS },
  { berkas: "katalog/10-lampu-sorot.jpg", barang: "Lampu Sorot LED", pembuat: "Francesco Paggiaro", halaman: "https://www.pexels.com/photo/1585376/", ...PEXELS },
];

// Foto bawaan yang dipasang ke aset contoh: kode aset lalu nama berkas.
export const FOTO_ASET_CONTOH: Record<string, string> = {
  "TS-33": "katalog/01-sarnafil-3x3.jpg",
  "TS-55": "katalog/22-sarnafil-5x5.jpg",
  "TR-10": "katalog/03b-roder.jpg",
  "TD-46": "katalog/04-dekorasi.jpg",
  "LT-01": "katalog/05-panggung.jpg",
  "KS-01": "katalog/06-kursi.jpg",
  "MJ-01": "katalog/07-meja-bundar.jpg",
  "KP-01": "katalog/09-kipas-kabut.jpg",
  "LP-01": "katalog/10-lampu-sorot.jpg",
};
