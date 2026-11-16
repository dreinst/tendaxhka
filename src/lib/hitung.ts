// Hitungan murni tanpa basis data, supaya bisa diuji langsung dengan node --test.

export type Peran = "admin" | "sales" | "gudang" | "kru" | "partner";

// Siapa boleh apa. Partner hanya melihat, termasuk angka keuangan dan bagi hasil.
export const HAK = {
  "kontak.lihat": ["admin", "sales", "partner"],
  "kontak.tulis": ["admin", "sales"],
  "pesanan.lihat": ["admin", "sales", "gudang", "partner"],
  "pesanan.tulis": ["admin", "sales"],
  "aset.lihat": ["admin", "sales", "gudang", "kru", "partner"],
  "aset.tulis": ["admin", "gudang"],
  "jadwal.lihat": ["admin", "sales", "gudang", "kru", "partner"],
  "jadwal.tulis": ["admin", "sales", "gudang"],
  "jadwal.centang": ["admin", "gudang", "kru"],
  "keuangan.lihat": ["admin", "partner"],
  "keuangan.tulis": ["admin"],
  pengaturan: ["admin"],
} as const satisfies Record<string, readonly Peran[]>;

export type Hak = keyof typeof HAK;

export function boleh(peran: Peran, hak: Hak): boolean {
  return (HAK[hak] as readonly Peran[]).includes(peran);
}

export function tanggalSah(t: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(`${t}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
}

export function tambahHari(t: string, n: number): string {
  const d = new Date(`${t}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Semua tanggal dari awal sampai akhir, keduanya ikut.
export function rentangHari(awal: string, akhir: string): string[] {
  const hasil: string[] = [];
  for (let t = awal; t <= akhir; t = tambahHari(t, 1)) hasil.push(t);
  return hasil;
}

export function batasBulan(bulan: string): { awal: string; akhir: string; hari: number } {
  const [y, m] = bulan.split("-").map(Number);
  const hari = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { awal: `${bulan}-01`, akhir: `${bulan}-${String(hari).padStart(2, "0")}`, hari };
}

export function geserBulan(bulan: string, n: number): string {
  const [y, m] = bulan.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

export type Baris = { jumlah: number; hari: number; harga: number };

export function nilaiBaris(b: Baris): number {
  return b.jumlah * b.hari * b.harga;
}

export function totalPesanan(baris: Baris[], diskon: number): { subtotal: number; total: number } {
  const subtotal = baris.reduce((s, b) => s + nilaiBaris(b), 0);
  return { subtotal, total: Math.max(0, subtotal - diskon) };
}

// Pemakaian satu aset dalam satu rentang tanggal: pesanan yang sudah dibooking, atau unit yang diperbaiki
// (akhir kosong berarti belum selesai).
export type Pakai = { asetId: number; jumlah: number; awal: string; akhir: string | null };

export function pakaiPerHari(pakai: Pakai[], asetId: number, hari: string[]): number[] {
  const milik = pakai.filter((p) => p.asetId === asetId);
  return hari.map((t) => milik.reduce((s, p) => (p.awal <= t && (p.akhir === null || p.akhir >= t) ? s + p.jumlah : s), 0));
}

// Sisa unit yang bisa dijanjikan untuk seluruh rentang ditentukan oleh hari yang paling padat.
export function sisaTersedia(total: number, pakai: Pakai[], asetId: number, awal: string, akhir: string): number {
  return total - Math.max(0, ...pakaiPerHari(pakai, asetId, rentangHari(awal, akhir)));
}

// Utilisasi sebulan: unit-hari yang tersewa dibagi unit-hari yang dimiliki.
export function utilisasi(total: number, sewa: Pakai[], asetId: number, bulan: string): number {
  const { awal, akhir, hari } = batasBulan(bulan);
  if (total <= 0) return 0;
  const terpakai = pakaiPerHari(sewa, asetId, rentangHari(awal, akhir)).reduce((s, n) => s + Math.min(n, total), 0);
  return terpakai / (total * hari);
}

export type MasukanLaba = {
  pendapatan: number;
  biayaLangsung: number;
  biayaOperasional: number;
  persenCadangan: number;
  persenPajak: number;
  porsiTenda: number;
};

export type HasilLaba = {
  pendapatan: number;
  biayaLangsung: number;
  biayaOperasional: number;
  cadangan: number;
  pajak: number;
  labaBersih: number;
  bagianTenda: number;
  bagianHka: number;
};

// Nett profit = pendapatan - biaya langsung - biaya operasional - cadangan - pajak.
// Pajak dihitung dari pendapatan. Cadangan dihitung dari laba sesudah pajak dan hanya disisihkan saat
// laba itu positif. Rugi ikut dibagi dengan porsi yang sama.
export function hitungLaba(m: MasukanLaba): HasilLaba {
  const pajak = Math.round((m.pendapatan * m.persenPajak) / 100);
  const sebelumCadangan = m.pendapatan - m.biayaLangsung - m.biayaOperasional - pajak;
  const cadangan = sebelumCadangan > 0 ? Math.round((sebelumCadangan * m.persenCadangan) / 100) : 0;
  const labaBersih = sebelumCadangan - cadangan;
  const bagianTenda = Math.round((labaBersih * m.porsiTenda) / 100);
  return {
    pendapatan: m.pendapatan,
    biayaLangsung: m.biayaLangsung,
    biayaOperasional: m.biayaOperasional,
    cadangan,
    pajak,
    labaBersih,
    bagianTenda,
    bagianHka: labaBersih - bagianTenda,
  };
}

export type ButirChecklist = { teks: string; beres: boolean };

export function bacaChecklist(json: string): ButirChecklist[] {
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data
      .filter((b): b is ButirChecklist => typeof b?.teks === "string")
      .map((b) => ({ teks: b.teks, beres: b.beres === true }));
  } catch {
    return [];
  }
}

// Nomor untuk tautan wa.me: hanya angka dengan kode negara 62. Menerima "0812-3456-7890", "+62 812 3456 7890",
// atau "812 3456 7890". Nomor yang tidak terlihat seperti nomor seluler Indonesia menghasilkan null.
export function nomorWa(teks: string): string | null {
  let n = teks.replace(/\D/g, "");
  if (n.startsWith("0")) n = `62${n.slice(1)}`;
  else if (n.startsWith("8")) n = `62${n}`;
  return /^628\d{7,11}$/.test(n) ? n : null;
}

// Nama berkas foto dibuat sendiri oleh server: 32 karakter heksadesimal dan akhiran .jpg. Nama lain ditolak,
// jadi alamat /foto/... tidak bisa dipakai untuk membaca berkas di luar folder foto.
export function namaFotoSah(nama: string): boolean {
  return /^[a-f0-9]{32}\.jpg$/.test(nama);
}

// Pemeriksaan ringan bahwa isi berkas memang JPEG: diawali FF D8 FF dan diakhiri FF D9.
export function tampakJpeg(b: Uint8Array): boolean {
  return b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9;
}

export const MAKS_FOTO_PER_ASET = 8;
export const MAKS_UKURAN_FOTO = 800_000;
