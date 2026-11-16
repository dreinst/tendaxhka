// Daftar foto bawaan di public/katalog beserta pembuat dan lisensinya. Semua foto ini foto ilustrasi karya pihak
// lain. Foto berlisensi Creative Commons wajib disebut pembuatnya, ditautkan ke lisensinya, dan diberi keterangan
// kalau diubah, jadi kolom di bawah harus selalu lengkap saat foto diganti.
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
const CC_BY_3 = { lisensi: "CC BY 3.0", tautanLisensi: "https://creativecommons.org/licenses/by/3.0/", ubahan: "Diperkecil dan dipotong sesuai bingkai" };

export const KREDIT_FOTO: KreditFoto[] = [
  { berkas: "katalog/21-hero-halaman.jpg", barang: "Foto utama di beranda", pembuat: "Don Williams", halaman: "https://commons.wikimedia.org/wiki/File:High_Peak_Frame_Tent_20_x_30.JPG", ...CC_BY_3 },
  { berkas: "katalog/13-dalam-tenda.jpg", barang: "Bagian dalam tenda di beranda", pembuat: "Don Williams", halaman: "https://commons.wikimedia.org/wiki/File:Frame_Tent_Inside_View_30_x_45.JPG", ...CC_BY_3 },
  {
    berkas: "katalog/16-tepi-laut.jpg",
    barang: "Tenda saat acara di beranda",
    pembuat: "gsf747",
    lisensi: "CC BY-SA 2.0",
    tautanLisensi: "https://creativecommons.org/licenses/by-sa/2.0/",
    halaman: "https://www.flickr.com/photos/85931610@N00/716406412",
    ubahan: "Dipotong sesuai bingkai. Hasil potongan ini berlisensi sama",
  },
  { berkas: "katalog/15-terpasang.jpg", barang: "Tenda terpasang di bagian cara sewa dan katalog", pembuat: "Don Williams", halaman: "https://commons.wikimedia.org/wiki/File:Frame_Tent_Outside_View_30_x_45.JPG", ...CC_BY_3 },
  {
    berkas: "katalog/03b-roder.jpg",
    barang: "Tenda Roder",
    pembuat: "Acabashi",
    lisensi: "CC BY-SA 4.0",
    tautanLisensi: "https://creativecommons.org/licenses/by-sa/4.0/",
    halaman: "https://commons.wikimedia.org/wiki/File:Event_marquee_Capel_Manor_College_Gardens_Enfield_London_England_01.jpg",
    ubahan: "Dipotong dari foto panorama dan diperkecil. Hasil potongan ini berlisensi sama",
  },
  { berkas: "katalog/22-sarnafil-5x5.jpg", barang: "Tenda Sarnafil 5x5 m", pembuat: "Sydney Sang", halaman: "https://www.pexels.com/photo/28937190/", ...PEXELS },
  { berkas: "katalog/01-sarnafil-3x3.jpg", barang: "Tenda Sarnafil 3x3 m", pembuat: "Tito Zzzz", halaman: "https://www.pexels.com/photo/29995960/", ...PEXELS },
  { berkas: "katalog/04-dekorasi.jpg", barang: "Tenda Dekorasi", pembuat: "MunozPhoto_", halaman: "https://www.pexels.com/photo/19024675/", ...PEXELS },
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
  "KS-01": "katalog/06-kursi.jpg",
  "MJ-01": "katalog/07-meja-bundar.jpg",
  "KP-01": "katalog/09-kipas-kabut.jpg",
  "LP-01": "katalog/10-lampu-sorot.jpg",
};
