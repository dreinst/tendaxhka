import { jalankan, satu } from "./db.ts";

// Pembatas percobaan untuk halaman masuk dan formulir website. Hitungannya disimpan di basis data (tabel
// pembatas), jadi sama di semua server dan tidak hilang saat server dimulai ulang. Satu baris per kunci
// berisi awal jendela dan jumlah percobaan di jendela itu. Jendela dihitung sejak percobaan pertama.

const menit = (n: number) => n * 60_000;

export const JENDELA_MASUK = 15;

// Jumlah percobaan yang tercatat untuk satu kunci selama jendelanya masih berjalan.
export async function hitungan(kunci: string, jendelaMenit: number, kini = Date.now()): Promise<number> {
  const b = await satu<{ mulai: number; jumlah: number }>("SELECT mulai, jumlah FROM pembatas WHERE kunci = ?", kunci);
  return b && kini - b.mulai < menit(jendelaMenit) ? b.jumlah : 0;
}

// Menambah satu percobaan. Jendela yang sudah lewat dimulai lagi dari satu. Kolom baris lama ditulis dengan nama
// tabelnya, karena di PostgreSQL nama polos ambigu dengan excluded.
export async function catatPercobaan(kunci: string, jendelaMenit: number, kini = Date.now()): Promise<void> {
  await jalankan(
    `INSERT INTO pembatas (kunci, mulai, jumlah) VALUES (?, ?, 1)
     ON CONFLICT (kunci) DO UPDATE SET
       jumlah = CASE WHEN excluded.mulai - pembatas.mulai >= ? THEN 1 ELSE pembatas.jumlah + 1 END,
       mulai = CASE WHEN excluded.mulai - pembatas.mulai >= ? THEN excluded.mulai ELSE pembatas.mulai END`,
    kunci,
    kini,
    menit(jendelaMenit),
    menit(jendelaMenit),
  );
}

export async function lupakanPercobaan(kunci: string[]): Promise<void> {
  for (const k of kunci) await jalankan("DELETE FROM pembatas WHERE kunci = ?", k);
}

// Hitungan yang jendelanya sudah lama lewat dan perangkat yang sudah kedaluwarsa dibuang supaya kedua
// tabel tidak terus membesar.
export async function bersihkanPembatas(kini = Date.now()): Promise<void> {
  await jalankan("DELETE FROM pembatas WHERE mulai < ?", kini - 24 * 3600_000);
  await jalankan("DELETE FROM perangkat WHERE kedaluwarsa <= ?", new Date(kini).toISOString());
}

export type BatasMasuk = { kunci: string; maks: number; lupakan: boolean };

// Hitungan yang berlaku untuk satu percobaan masuk, masing-masing dengan batasnya per 15 menit. Semuanya
// hanya bertambah saat sandi salah, dan percobaan yang sudah ditolak pembatas tidak ikut dihitung, jadi
// orang yang sedang diblokir tidak bisa memperpanjang blokirnya sendiri atau blokir orang lain.
//  - alamat dan username: menebak satu akun dari satu alamat.
//  - alamat saja: menebak banyak akun dari satu alamat. Tidak dihapus saat berhasil masuk, supaya pemilik
//    satu akun tidak bisa mengosongkannya lalu lanjut menebak akun lain.
//  - username dari perangkat asing: menebak satu akun dari banyak alamat.
//  - perangkat yang dikenal: perangkat yang pernah berhasil masuk ke akun itu punya jatah sendiri. Tanpa ini,
//    orang luar yang menghabiskan jatah sebuah username ikut mengunci pemilik akunnya.
// Alamat yang tidak diketahui (ip kosong) tidak dihitung sama sekali. Menghitungnya berarti semua pengunjung
// berbagi satu jatah, dan satu orang bisa menutup halaman masuk untuk semua staf.
export function batasMasuk(ip: string | null, username: string, perangkat: string | null): BatasMasuk[] {
  return [
    ...(ip
      ? [
          { kunci: `masuk|${ip}|${username}`, maks: 5, lupakan: true },
          { kunci: `masuk-ip|${ip}`, maks: 20, lupakan: false },
        ]
      : []),
    perangkat
      ? { kunci: `masuk-perangkat|${perangkat.slice(0, 32)}|${username}`, maks: 10, lupakan: true }
      : { kunci: `masuk-akun|${username}`, maks: 10, lupakan: true },
  ];
}

export async function melewatiBatas(batas: { kunci: string; maks: number }[], jendelaMenit: number, kini = Date.now()): Promise<boolean> {
  const jumlah = await Promise.all(batas.map((b) => hitungan(b.kunci, jendelaMenit, kini)));
  return batas.some((b, i) => jumlah[i] >= b.maks);
}

// Perangkat yang pernah berhasil masuk dikenali lewat cookie berisi token acak. Basis data hanya menyimpan
// hash-nya, dipasangkan dengan akun yang berhasil masuk. Satu perangkat boleh dikenal untuk beberapa akun,
// misalnya komputer kantor yang dipakai bergantian.
export async function perangkatMilik(hash: string, username: string, kini = Date.now()): Promise<boolean> {
  return !!(await satu(
    `SELECT 1 FROM perangkat p JOIN pengguna u ON u.id = p.pengguna_id
     WHERE p.token = ? AND u.username = ? AND u.aktif = 1 AND p.kedaluwarsa > ?`,
    hash,
    username,
    new Date(kini).toISOString(),
  ));
}

export async function catatPerangkat(hash: string, penggunaId: number, kedaluwarsa: Date): Promise<void> {
  await jalankan(
    `INSERT INTO perangkat (token, pengguna_id, kedaluwarsa) VALUES (?, ?, ?)
     ON CONFLICT (token, pengguna_id) DO UPDATE SET kedaluwarsa = excluded.kedaluwarsa`,
    hash,
    penggunaId,
    kedaluwarsa.toISOString(),
  );
}

// Dipanggil saat kata sandi akun diganti atau akunnya dinonaktifkan.
export async function lupakanPerangkat(penggunaId: number): Promise<void> {
  await jalankan("DELETE FROM perangkat WHERE pengguna_id = ?", penggunaId);
}
