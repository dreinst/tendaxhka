import { jalankan, satu, semua, transaksi } from "./db.ts";
import { hariIni, rupiah, waktuKini } from "./format.ts";
import {
  batasBulan,
  hitungLaba,
  pakaiPerHari,
  rentangHari,
  sisaTersedia,
  totalPesanan,
  utilisasi,
  type Baris,
  type HasilLaba,
  type Pakai,
  type Peran,
} from "./hitung.ts";

export type Pengguna = { id: number; nama: string; username: string; peran: Peran; aktif: number };

export type Aset = {
  id: number;
  kode: string;
  nama: string;
  kategori: string;
  ukuran: string;
  satuan: string;
  jumlah: number;
  harga: number;
  deskripsi: string;
  tampil_web: number;
  aktif: number;
  kapasitas: string;
  cocok: string;
};

export type Foto = { id: number; aset_id: number; berkas: string; urutan: number };

// Foto satu aset, sampul lebih dulu.
export function fotoAset(asetId: number): Foto[] {
  return semua<Foto>("SELECT * FROM aset_foto WHERE aset_id = ? ORDER BY urutan, id", asetId);
}

// Nama berkas foto semua aset, dikelompokkan per aset, untuk katalog dan daftar aset.
export function fotoPerAset(): Map<number, string[]> {
  const hasil = new Map<number, string[]>();
  for (const f of semua<Foto>("SELECT * FROM aset_foto ORDER BY urutan, id")) {
    hasil.set(f.aset_id, [...(hasil.get(f.aset_id) ?? []), f.berkas]);
  }
  return hasil;
}

export type Kontak = {
  id: number;
  nama: string;
  perusahaan: string;
  telepon: string;
  email: string;
  jenis: "perorangan" | "korporat";
  sumber: string;
  tahap: string;
  kebutuhan: string;
  tindak_lanjut: string | null;
  dibuat: string;
};

export type Pesanan = {
  id: number;
  nomor: string;
  kontak_id: number;
  kontak: string;
  perusahaan: string;
  acara: string;
  lokasi: string;
  mulai: string;
  selesai: string;
  status: string;
  diskon: number;
  catatan: string;
  tgl_faktur: string | null;
  dibuat: string;
  subtotal: number;
  total: number;
  dibayar: number;
  sisa: number;
};

export type BarisPesanan = {
  id: number;
  pesanan_id: number;
  aset_id: number | null;
  deskripsi: string;
  jumlah: number;
  hari: number;
  harga: number;
};

export type Tugas = {
  id: number;
  pesanan_id: number;
  jenis: string;
  tanggal: string;
  kru: string;
  checklist: string;
  selesai: number;
  catatan: string;
  nomor: string;
  acara: string;
  lokasi: string;
};

export type Biaya = {
  id: number;
  tanggal: string;
  jenis: string;
  kategori: string;
  pesanan_id: number | null;
  jumlah: number;
  keterangan: string;
  nomor: string | null;
};

// Rumus bagi hasil dan identitas usaha bisa diubah di halaman Pengaturan tanpa menyentuh kode.
export const PENGATURAN_BAWAAN = {
  nama_usaha: "Tenda Indonesia",
  telepon: "",
  whatsapp: "",
  email: "",
  alamat: "",
  rekening: "",
  basis: "kas",
  persen_cadangan: "0",
  persen_pajak: "0",
  porsi_tenda: "50",
  checklist_pasang: "Cek lokasi dan titik pasang\nHitung barang keluar gudang\nPasang rangka dan atap\nPasang dinding dan pemberat\nFoto hasil pasang\nSerah terima ke pelanggan",
  checklist_bongkar: "Bongkar dinding dan atap\nBongkar rangka\nHitung barang kembali ke gudang\nCatat barang rusak atau hilang",
} as const;

export type Pengaturan = Record<keyof typeof PENGATURAN_BAWAAN, string>;

export function pengaturan(): Pengaturan {
  const hasil: Record<string, string> = { ...PENGATURAN_BAWAAN };
  for (const b of semua<{ kunci: string; nilai: string }>("SELECT kunci, nilai FROM pengaturan")) {
    if (b.kunci in hasil) hasil[b.kunci] = b.nilai;
  }
  return hasil as Pengaturan;
}

const PILIH_PESANAN = `
  SELECT p.*, k.nama AS kontak, k.perusahaan,
    COALESCE((SELECT SUM(jumlah * hari * harga) FROM pesanan_baris WHERE pesanan_id = p.id), 0) AS subtotal,
    COALESCE((SELECT SUM(jumlah) FROM pembayaran WHERE pesanan_id = p.id), 0) AS dibayar
  FROM pesanan p JOIN kontak k ON k.id = p.kontak_id`;

function lengkapi(p: Pesanan): Pesanan {
  p.total = Math.max(0, p.subtotal - p.diskon);
  p.sisa = p.total - p.dibayar;
  return p;
}

export function daftarPesanan(syarat = "", ...p: (string | number)[]): Pesanan[] {
  return semua<Pesanan>(`${PILIH_PESANAN} ${syarat}`, ...p).map(lengkapi);
}

export function ambilPesanan(id: number): Pesanan | undefined {
  const p = satu<Pesanan>(`${PILIH_PESANAN} WHERE p.id = ?`, id);
  return p && lengkapi(p);
}

export function barisPesanan(id: number): BarisPesanan[] {
  return semua<BarisPesanan>("SELECT * FROM pesanan_baris WHERE pesanan_id = ? ORDER BY id", id);
}

type IsiPesanan = { baris: { asetId: number | null; deskripsi: string; jumlah: number; hari: number; harga: number }[]; diskon: number; mulai: string; selesai: string };

// Pemeriksaan sebelum pesanan yang sudah ada disimpan ulang. Pesan galat, atau null kalau boleh disimpan.
// Total baru tidak boleh lebih kecil dari uang yang sudah dibayar, dan sesudah faktur terbit baris, diskon,
// dan tanggal dikunci.
export function galatUbahPesanan(id: number, baru: IsiPesanan): string | null {
  const p = ambilPesanan(id);
  if (!p) return "Pesanan tidak ditemukan.";
  if (p.tgl_faktur) {
    const lama = barisPesanan(id).map((b) => [b.aset_id, b.deskripsi, b.jumlah, b.hari, b.harga]);
    const isi = baru.baris.map((b) => [b.asetId, b.deskripsi, b.jumlah, b.hari, b.harga]);
    if (JSON.stringify(lama) !== JSON.stringify(isi) || p.diskon !== baru.diskon || p.mulai !== baru.mulai || p.selesai !== baru.selesai) {
      return "Faktur sudah terbit, jadi baris, diskon, dan tanggal pesanan tidak bisa diubah.";
    }
  }
  const { total } = totalPesanan(baru.baris as Baris[], baru.diskon);
  if (total < p.dibayar) {
    return `Total baru ${rupiah(total)} lebih kecil dari yang sudah dibayar ${rupiah(p.dibayar)}. Hapus pembayarannya dulu atau kurangi perubahannya.`;
  }
  return null;
}

// Pesan galat untuk perubahan status yang melanggar aturan uang, null kalau boleh.
export function galatStatus(p: Pesanan, tujuan: string): string | null {
  if (p.dibayar > 0 && tujuan === "batal") return "Pesanan ini sudah menerima pembayaran. Hapus pembayarannya dulu sebelum membatalkan.";
  if (p.dibayar > 0 && tujuan === "penawaran") return "Pesanan ini sudah menerima pembayaran. Hapus pembayarannya dulu sebelum mengembalikannya ke penawaran.";
  return null;
}

// Mengubah status. Pesanan yang kembali ke penawaran kehilangan tanggal fakturnya.
export function setStatusPesanan(id: number, tujuan: string): void {
  jalankan("UPDATE pesanan SET status = ?, tgl_faktur = CASE WHEN ? = 'penawaran' THEN NULL ELSE tgl_faktur END WHERE id = ?", tujuan, tujuan, id);
}

// Mencabut semua sesi akun kecuali sesi yang sedang dipakai (hash token cookie saat ini, boleh kosong).
export function cabutSesiLain(penggunaId: number, hashSaatIni: string | null): void {
  jalankan("DELETE FROM sesi WHERE pengguna_id = ? AND token <> ?", penggunaId, hashSaatIni ?? "");
}

// Menyalin pesanan menjadi penawaran baru di tanggal lain, lengkap dengan jejak audit. Mengembalikan id baru.
export function salinPesanan(oleh: { id: number; nama: string }, id: number, mulai: string, selesai: string): number {
  const p = ambilPesanan(id);
  if (!p) throw new Error("Pesanan sumber tidak ditemukan.");
  return transaksi(() => {
    const hari = hariIni();
    const baru = jalankan(
      "INSERT INTO pesanan (nomor, kontak_id, acara, lokasi, mulai, selesai, diskon, catatan, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      nomorBerikut(hari),
      p.kontak_id,
      p.acara,
      p.lokasi,
      mulai,
      selesai,
      p.diskon,
      p.catatan,
      hari,
    );
    for (const b of barisPesanan(id)) {
      jalankan(
        "INSERT INTO pesanan_baris (pesanan_id, aset_id, deskripsi, jumlah, hari, harga) VALUES (?, ?, ?, ?, ?, ?)",
        baru,
        b.aset_id,
        b.deskripsi,
        b.jumlah,
        b.hari,
        b.harga,
      );
    }
    const salinan = ambilPesanan(baru)!;
    catatLog(oleh, "Salin pesanan", `${salinan.nomor} dari ${p.nomor}, ${mulai} sampai ${selesai}, total ${rupiah(salinan.total)}`);
    return baru;
  });
}

export function nomorBerikut(hari: string): string {
  const awalan = `TI-${hari.slice(2, 4)}${hari.slice(5, 7)}-`;
  const akhir = satu<{ nomor: string }>("SELECT nomor FROM pesanan WHERE nomor LIKE ? ORDER BY nomor DESC LIMIT 1", `${awalan}%`);
  const urut = akhir ? Number(akhir.nomor.slice(awalan.length)) + 1 : 1;
  return awalan + String(urut).padStart(3, "0");
}

// Pemakaian aset yang bersinggungan dengan satu rentang tanggal. Penawaran belum mengunci aset.
export function daftarPakai(
  awal: string,
  akhir: string,
  opsi: { kecualiPesanan?: number; perawatan?: boolean; status?: string[] } = {},
): Pakai[] {
  const status = opsi.status ?? ["booking", "berjalan"];
  const sewa = semua<Pakai>(
    `SELECT b.aset_id AS asetId, b.jumlah, p.mulai AS awal, p.selesai AS akhir
     FROM pesanan_baris b JOIN pesanan p ON p.id = b.pesanan_id
     WHERE b.aset_id IS NOT NULL AND p.status IN (${status.map(() => "?").join(",")})
       AND p.mulai <= ? AND p.selesai >= ? AND p.id <> ?`,
    ...status,
    akhir,
    awal,
    opsi.kecualiPesanan ?? 0,
  );
  if (opsi.perawatan === false) return sewa;
  const rawat = semua<Pakai>(
    `SELECT aset_id AS asetId, jumlah, mulai AS awal, selesai AS akhir FROM perawatan
     WHERE mulai <= ? AND (selesai IS NULL OR selesai >= ?)`,
    akhir,
    awal,
  );
  return [...sewa, ...rawat];
}

// Hari terpadat untuk satu aset sejak tanggal awal sampai booking terakhirnya selesai, menghitung booking
// yang sudah mengunci aset dan unit yang sedang diperbaiki. Dipakai sebelum stok berkurang (perawatan
// baru atau jumlah aset diturunkan) untuk tahu apakah booking yang sudah ada jadi kekurangan.
export function hariTerpadat(asetId: number, awal: string): { tanggal: string; jumlah: number } | null {
  const ujung = satu<{ t: string | null }>(
    `SELECT MAX(p.selesai) AS t FROM pesanan_baris b JOIN pesanan p ON p.id = b.pesanan_id
     WHERE b.aset_id = ? AND p.status IN ('booking', 'berjalan') AND p.selesai >= ?`,
    asetId,
    awal,
  )?.t;
  if (!ujung) return null;
  const hari = rentangHari(awal, ujung);
  const per = pakaiPerHari(daftarPakai(awal, ujung), asetId, hari);
  const i = per.indexOf(Math.max(...per));
  return { tanggal: hari[i], jumlah: per[i] };
}

// Jumlah unit satu aset yang masih diperbaiki pada atau sesudah tanggal tertentu. Perawatan tanpa tanggal
// selesai dihitung terus sampai ditandai selesai.
export function unitDirawat(asetId: number, sejak: string): number {
  return satu<{ n: number }>(
    "SELECT COALESCE(SUM(jumlah), 0) AS n FROM perawatan WHERE aset_id = ? AND (selesai IS NULL OR selesai >= ?)",
    asetId,
    sejak,
  )!.n;
}

// Daftar aset yang tidak cukup untuk pesanan ini di rentang tanggalnya. Kosong berarti aman dibooking.
export function kekurangan(pesananId: number): string[] {
  const p = satu<{ mulai: string; selesai: string }>("SELECT mulai, selesai FROM pesanan WHERE id = ?", pesananId);
  if (!p) return [];
  const butuh = semua<{ aset_id: number; nama: string; total: number; butuh: number }>(
    `SELECT b.aset_id, a.nama || CASE WHEN a.ukuran <> '' THEN ' ' || a.ukuran ELSE '' END AS nama, a.jumlah AS total,
       SUM(b.jumlah) AS butuh
     FROM pesanan_baris b JOIN aset a ON a.id = b.aset_id WHERE b.pesanan_id = ? GROUP BY b.aset_id`,
    pesananId,
  );
  const pakai = daftarPakai(p.mulai, p.selesai, { kecualiPesanan: pesananId });
  const kurang: string[] = [];
  for (const b of butuh) {
    const sisa = sisaTersedia(b.total, pakai, b.aset_id, p.mulai, p.selesai);
    if (b.butuh > sisa) kurang.push(`${b.nama}: butuh ${b.butuh}, tersedia ${Math.max(0, sisa)}`);
  }
  return kurang;
}

export function pendapatanBulan(bulan: string, basis: string): number {
  const { awal, akhir } = batasBulan(bulan);
  if (basis === "akrual") {
    return daftarPesanan("WHERE p.status NOT IN ('batal', 'penawaran') AND p.tgl_faktur BETWEEN ? AND ?", awal, akhir).reduce((s, p) => s + p.total, 0);
  }
  return satu<{ n: number }>("SELECT COALESCE(SUM(jumlah), 0) AS n FROM pembayaran WHERE tanggal BETWEEN ? AND ?", awal, akhir)!.n;
}

export function biayaBulan(bulan: string): { langsung: number; operasional: number } {
  const { awal, akhir } = batasBulan(bulan);
  const hasil = { langsung: 0, operasional: 0 };
  for (const b of semua<{ jenis: "langsung" | "operasional"; n: number }>(
    "SELECT jenis, SUM(jumlah) AS n FROM biaya WHERE tanggal BETWEEN ? AND ? GROUP BY jenis",
    awal,
    akhir,
  )) {
    hasil[b.jenis] = b.n;
  }
  return hasil;
}

export type Periode = HasilLaba & {
  bulan: string;
  dikunci: string | null;
  dibayarTenda: number;
  dibayarHka: number;
  catatan: string;
};

type BarisPeriode = {
  bulan: string;
  pendapatan: number;
  biaya_langsung: number;
  biaya_operasional: number;
  cadangan: number;
  pajak: number;
  laba_bersih: number;
  bagian_tenda: number;
  bagian_hka: number;
  dibayar_tenda: number;
  dibayar_hka: number;
  dikunci: string;
  catatan: string;
};

// Bulan yang sudah ditutup memakai angka beku. Bulan terbuka dihitung ulang dari transaksi.
export function labaBulan(bulan: string): Periode {
  const k = satu<BarisPeriode>("SELECT * FROM periode WHERE bulan = ?", bulan);
  if (k) {
    return {
      bulan,
      pendapatan: k.pendapatan,
      biayaLangsung: k.biaya_langsung,
      biayaOperasional: k.biaya_operasional,
      cadangan: k.cadangan,
      pajak: k.pajak,
      labaBersih: k.laba_bersih,
      bagianTenda: k.bagian_tenda,
      bagianHka: k.bagian_hka,
      dikunci: k.dikunci,
      dibayarTenda: k.dibayar_tenda,
      dibayarHka: k.dibayar_hka,
      catatan: k.catatan,
    };
  }
  const s = pengaturan();
  const biaya = biayaBulan(bulan);
  const hasil = hitungLaba({
    pendapatan: pendapatanBulan(bulan, s.basis),
    biayaLangsung: biaya.langsung,
    biayaOperasional: biaya.operasional,
    persenCadangan: Number(s.persen_cadangan) || 0,
    persenPajak: Number(s.persen_pajak) || 0,
    porsiTenda: Number(s.porsi_tenda) || 0,
  });
  return { ...hasil, bulan, dikunci: null, dibayarTenda: 0, dibayarHka: 0, catatan: "" };
}

export function bulanTerkunci(tanggal: string): boolean {
  return !!satu("SELECT 1 FROM periode WHERE bulan = ?", tanggal.slice(0, 7));
}

// Waktu kunci memakai waktu WIB, sama dengan jejak audit, supaya tanggalnya tidak bergeser sehari.
export function kunciBulan(bulan: string, waktu: string = waktuKini()): void {
  const l = labaBulan(bulan);
  jalankan(
    `INSERT INTO periode (bulan, pendapatan, biaya_langsung, biaya_operasional, cadangan, pajak, laba_bersih,
       bagian_tenda, bagian_hka, dikunci) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    bulan,
    l.pendapatan,
    l.biayaLangsung,
    l.biayaOperasional,
    l.cadangan,
    l.pajak,
    l.labaBersih,
    l.bagianTenda,
    l.bagianHka,
    waktu,
  );
}

export { totalPesanan };

// Utilisasi per aset dalam satu bulan, dihitung dari pesanan yang dibooking, berjalan, atau selesai.
export function utilisasiBulan(bulan: string): { baris: { aset: Aset; nilai: number }[]; rata: number } {
  const { awal, akhir } = batasBulan(bulan);
  const sewa = daftarPakai(awal, akhir, { perawatan: false, status: ["booking", "berjalan", "selesai"] });
  const aset = semua<Aset>("SELECT * FROM aset WHERE aktif = 1 AND jumlah > 0 ORDER BY kategori, nama, ukuran");
  const baris = aset.map((a) => ({ aset: a, nilai: utilisasi(a.jumlah, sewa, a.id, bulan) }));
  const unit = aset.reduce((s, a) => s + a.jumlah, 0);
  const rata = unit ? baris.reduce((s, b) => s + b.nilai * b.aset.jumlah, 0) / unit : 0;
  return { baris, rata };
}

// Jejak audit

export type Log = { id: number; waktu: string; pengguna: string; aksi: string; rincian: string };

export function catatLog(oleh: { id: number; nama: string }, aksi: string, rincian = ""): void {
  jalankan(
    "INSERT INTO log_aktivitas (waktu, pengguna_id, pengguna, aksi, rincian) VALUES (?, ?, ?, ?, ?)",
    waktuKini(),
    oleh.id,
    oleh.nama,
    aksi,
    rincian.slice(0, 1000),
  );
}

export function daftarLog(bulan: string): Log[] {
  return semua<Log>("SELECT id, waktu, pengguna, aksi, rincian FROM log_aktivitas WHERE waktu LIKE ? ORDER BY id DESC", `${bulan}-%`);
}
