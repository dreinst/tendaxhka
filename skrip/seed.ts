// Mengisi basis data dengan DATA CONTOH untuk mencoba sistem di lokal: akun, aset, harga, pelanggan, dan
// pesanan di sini semuanya karangan. Jalankan: npm run seed (tambah -- --timpa untuk mengosongkan dulu).
import { kunciBulan, nomorBerikut, PENGATURAN_BAWAAN } from "../src/lib/data.ts";
import { jalankan, satu, transaksi } from "../src/lib/db.ts";
import { hariIni } from "../src/lib/format.ts";
import { geserBulan, tambahHari } from "../src/lib/hitung.ts";
import { hashSandi } from "../src/lib/sandi.ts";

const SANDI = "tenda12345";
const TABEL = ["periode", "tugas", "biaya", "pembayaran", "pesanan_baris", "pesanan", "kontak", "perawatan", "aset", "pengaturan", "sesi", "pengguna"];

if (satu("SELECT 1 FROM pengguna LIMIT 1")) {
  if (!process.argv.includes("--timpa")) {
    console.error("Basis data sudah berisi. Jalankan dengan -- --timpa untuk mengosongkan dan mengisi ulang.");
    process.exit(1);
  }
  transaksi(() => TABEL.forEach((t) => jalankan(`DELETE FROM ${t}`)));
}

const hari = hariIni();
const beres = (teks: string, selesai: boolean) =>
  JSON.stringify(teks.split("\n").map((t) => ({ teks: t, beres: selesai })));

transaksi(() => {
  for (const [nama, username, peran] of [
    ["Admin Sistem", "admin", "admin"],
    ["Sales Contoh", "sales", "sales"],
    ["Kepala Gudang Contoh", "gudang", "gudang"],
    ["Kru Contoh", "kru", "kru"],
    ["Partner Tenda Indonesia", "partner-tenda", "partner"],
    ["Partner HKA Management", "partner-hka", "partner"],
  ]) {
    jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES (?, ?, ?, ?)", nama, username, hashSandi(SANDI), peran);
  }

  // [kode, nama, kategori, ukuran, satuan, jumlah, harga, deskripsi]
  const aset: [string, string, string, string, string, number, number, string][] = [
    ["TS-33", "Tenda Sarnafil", "Tenda", "3x3 m", "unit", 20, 450_000, "Cukup untuk satu stan atau meja registrasi."],
    ["TS-55", "Tenda Sarnafil", "Tenda", "5x5 m", "unit", 12, 900_000, "Ukuran yang paling sering keluar gudang, muat sekitar 30 kursi."],
    ["TR-10", "Tenda Roder", "Tenda", "10x5 m per modul", "modul", 8, 3_500_000, "Tanpa tiang tengah, bisa disambung memanjang untuk pesta atau pameran."],
    ["TD-46", "Tenda Dekorasi", "Tenda", "4x6 m", "unit", 10, 600_000, "Rangka dengan plafon kain untuk hajatan."],
    ["LT-01", "Lantai Panggung", "Lantai dan panggung", "1,2x2,4 m", "lembar", 60, 85_000, "Papan rata di atas rangka, untuk tanah yang becek atau miring."],
    ["KS-01", "Kursi Futura", "Kursi dan meja", "", "buah", 300, 6_000, "Kursi lipat dengan sarung."],
    ["MJ-01", "Meja Bundar", "Kursi dan meja", "diameter 120 cm", "buah", 30, 60_000, "Untuk 8 sampai 10 orang, sudah dengan taplak."],
    ["AC-05", "AC Standing", "Pendingin", "5 PK", "unit", 6, 1_250_000, "Untuk tenda tertutup. Butuh sambungan listrik atau genset."],
    ["KP-01", "Kipas Kabut", "Pendingin", "", "unit", 12, 250_000, "Kipas dengan semprotan air halus untuk tenda terbuka."],
    ["LP-01", "Lampu Sorot LED", "Lampu dan listrik", "100 watt", "unit", 24, 75_000, "Penerangan area tenda untuk acara malam."],
  ];
  const idAset: Record<string, number> = {};
  for (const a of aset) {
    idAset[a[0]] = jalankan("INSERT INTO aset (kode, nama, kategori, ukuran, satuan, jumlah, harga, deskripsi) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ...a);
  }
  jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai, catatan) VALUES (?, 2, ?, 'Atap sobek, dijahit ulang')", idAset["TS-55"], tambahHari(hari, -3));

  // [nama, perusahaan, telepon, jenis, sumber, tahap, kebutuhan, tindak lanjut (selisih hari) atau null]
  const kontak: [string, string, string, string, string, string, string, number | null][] = [
    ["Rina Contoh", "PT Contoh Abadi", "0811-0000-001", "korporat", "rujukan", "menang", "Gathering tahunan karyawan", null],
    ["Bagas Contoh", "", "0811-0000-002", "perorangan", "Instagram", "menang", "Resepsi pernikahan", null],
    ["Dewi Contoh", "CV Contoh Pameran", "0811-0000-003", "korporat", "website", "menang", "Pameran UMKM", null],
    ["Yusuf Contoh", "Panitia Contoh Kampus", "0811-0000-004", "korporat", "website", "penawaran", "Wisuda, 500 tamu", 2],
    ["Sinta Contoh", "", "0811-0000-005", "perorangan", "Instagram", "dihubungi", "Syukuran rumah, 80 tamu", 0],
    ["Hendra Contoh", "PT Contoh Makmur", "0811-0000-006", "korporat", "website", "baru", "Tanggal acara belum pasti. Butuh tenda roder untuk peluncuran produk.", -1],
  ];
  const idKontak = kontak.map(([nama, perusahaan, telepon, jenis, sumber, tahap, kebutuhan, tl], i) =>
    jalankan(
      "INSERT INTO kontak (nama, perusahaan, telepon, jenis, sumber, tahap, kebutuhan, tindak_lanjut, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      nama, perusahaan, telepon, jenis, sumber, tahap, kebutuhan, tl === null ? null : tambahHari(hari, tl), tambahHari(hari, -80 + i * 12),
    ),
  );

  type Butir = [kode: string | null, deskripsi: string, jumlah: number, hari: number, harga?: number];
  function pesanan(k: number, acara: string, lokasi: string, geser: number, lama: number, status: string, butir: Butir[], lunas: number, biaya: [string, number][]) {
    const mulai = tambahHari(hari, geser);
    const selesai = tambahHari(mulai, lama);
    const dibuat = tambahHari(mulai, -14);
    const dipesan = status !== "penawaran";
    const id = jalankan(
      "INSERT INTO pesanan (nomor, kontak_id, acara, lokasi, mulai, selesai, status, tgl_faktur, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      nomorBerikut(dibuat), idKontak[k], acara, lokasi, mulai, selesai, status, status === "selesai" ? selesai : null, dibuat,
    );
    let total = 0;
    for (const [kode, deskripsi, jumlah, hr, harga] of butir) {
      const a = kode ? aset.find((x) => x[0] === kode)! : null;
      const h = harga ?? a?.[6] ?? 0;
      total += jumlah * hr * h;
      jalankan(
        "INSERT INTO pesanan_baris (pesanan_id, aset_id, deskripsi, jumlah, hari, harga) VALUES (?, ?, ?, ?, ?, ?)",
        id, kode ? idAset[kode] : null, deskripsi || `${a![1]} ${a![3]}`.trim(), jumlah, hr, h,
      );
    }
    if (!dipesan) return;
    // DP 50% saat booking, sisanya saat acara selesai.
    const dp = Math.round(total / 2);
    if (lunas >= 1) jalankan("INSERT INTO pembayaran (pesanan_id, tanggal, jumlah, catatan) VALUES (?, ?, ?, 'DP')", id, tambahHari(mulai, -10), dp);
    if (lunas >= 2) jalankan("INSERT INTO pembayaran (pesanan_id, tanggal, jumlah, catatan) VALUES (?, ?, ?, 'Pelunasan')", id, selesai, total - dp);
    for (const [kategori, jumlah] of biaya) {
      jalankan("INSERT INTO biaya (tanggal, jenis, kategori, pesanan_id, jumlah) VALUES (?, 'langsung', ?, ?, ?)", mulai, kategori, id, jumlah);
    }
    const sudahPasang = status === "berjalan" || status === "selesai";
    jalankan(
      "INSERT INTO tugas (pesanan_id, jenis, tanggal, kru, checklist, selesai) VALUES (?, 'pasang', ?, ?, ?, ?)",
      id, mulai, "Tim A (4 orang)", beres(PENGATURAN_BAWAAN.checklist_pasang, sudahPasang), sudahPasang ? 1 : 0,
    );
    jalankan(
      "INSERT INTO tugas (pesanan_id, jenis, tanggal, kru, checklist, selesai) VALUES (?, 'bongkar', ?, ?, ?, ?)",
      id, selesai, status === "booking" ? "" : "Tim A (4 orang)", beres(PENGATURAN_BAWAAN.checklist_bongkar, status === "selesai"), status === "selesai" ? 1 : 0,
    );
  }

  const antar: Butir = [null, "Antar, pasang, dan bongkar", 1, 1, 1_500_000];
  pesanan(0, "Gathering karyawan", "Lapangan Contoh, Kota Contoh", -72, 2, "selesai", [["TR-10", "", 4, 2], ["KS-01", "", 200, 2], ["AC-05", "", 4, 2], antar], 2, [["Transport", 1_200_000], ["Upah kru", 2_400_000]]);
  pesanan(1, "Resepsi pernikahan", "Jl. Contoh No. 1", -41, 1, "selesai", [["TD-46", "", 6, 1], ["KS-01", "", 150, 1], ["MJ-01", "", 15, 1], antar], 2, [["Transport", 800_000], ["Upah kru", 1_600_000]]);
  pesanan(2, "Pameran UMKM", "Alun-alun Contoh", -19, 3, "selesai", [["TS-33", "", 16, 3], ["TS-55", "", 4, 3], ["LP-01", "", 16, 3], antar], 2, [["Transport", 1_000_000], ["Upah kru", 2_000_000], ["Sewa genset", 1_500_000]]);
  pesanan(0, "Peluncuran produk", "Halaman Kantor Contoh", -1, 2, "berjalan", [["TR-10", "", 3, 2], ["LT-01", "", 40, 2], ["AC-05", "", 3, 2], antar], 1, [["Transport", 900_000]]);
  pesanan(2, "Bazar akhir pekan", "Parkir Mal Contoh", 5, 2, "booking", [["TS-55", "", 8, 2], ["KP-01", "", 6, 2], antar], 1, []);
  pesanan(1, "Syukuran keluarga", "Jl. Contoh No. 1", 12, 1, "booking", [["TD-46", "", 3, 1], ["KS-01", "", 80, 1], antar], 0, []);
  // Penawaran ini sengaja bentrok dengan bazar akhir pekan supaya peringatan ketersediaan terlihat.
  pesanan(3, "Wisuda", "Halaman Kampus Contoh", 6, 1, "penawaran", [["TR-10", "", 6, 1], ["TS-55", "", 6, 1], ["KS-01", "", 300, 1], antar], 0, []);

  const bulan = hari.slice(0, 7);
  for (const n of [-2, -1, 0]) {
    const tgl = `${geserBulan(bulan, n)}-05`;
    if (tgl > hari) continue;
    for (const [kategori, jumlah] of [["Sewa gudang", 4_000_000], ["Gaji tim tetap", 9_000_000], ["Listrik dan air", 650_000]] as const) {
      jalankan("INSERT INTO biaya (tanggal, jenis, kategori, jumlah) VALUES (?, 'operasional', ?, ?)", tgl, kategori, jumlah);
    }
  }
  kunciBulan(geserBulan(bulan, -2), new Date().toISOString());
});

console.log(`Data contoh terisi. Akun: admin, sales, gudang, kru, partner-tenda, partner-hka. Kata sandi semuanya: ${SANDI}`);
