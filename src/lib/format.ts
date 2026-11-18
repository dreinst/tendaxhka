export const ZONA = "Asia/Jakarta";

export function rupiah(n: number): string {
  const s = Math.abs(Math.round(n)).toLocaleString("id-ID");
  return n < 0 ? `(Rp ${s})` : `Rp ${s}`;
}

export function persen(n: number): string {
  return `${(n * 100).toLocaleString("id-ID", { maximumFractionDigits: 0 })}%`;
}

export function hariIni(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

export function tanggal(t: string | null | undefined): string {
  if (!t) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${t}T00:00:00Z`),
  );
}

export function namaBulan(bulan: string): string {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${bulan}-01T00:00:00Z`),
  );
}

export const LABEL_STATUS: Record<string, string> = {
  penawaran: "Penawaran",
  booking: "Booking",
  berjalan: "Berjalan",
  selesai: "Selesai",
  batal: "Batal",
};

export const LABEL_TAHAP: Record<string, string> = {
  baru: "Baru",
  dihubungi: "Dihubungi",
  penawaran: "Penawaran",
  menang: "Menang",
  kalah: "Kalah",
};

export const LABEL_TUGAS: Record<string, string> = {
  survei: "Survei",
  pasang: "Pasang",
  bongkar: "Bongkar",
  lainnya: "Lainnya",
};

export const LABEL_PERAN: Record<string, string> = {
  admin: "Admin",
  sales: "Sales",
  gudang: "Gudang",
  kru: "Kru",
  partner: "Partner",
};

// Waktu tersimpan ("2026-11-14 22:30:05", WIB) untuk dibaca orang, misalnya "14 Nov 2026, 22.30".
export function waktu(w: string): string {
  return `${tanggal(w.slice(0, 10))}, ${w.slice(11, 16).replace(":", ".")}`;
}

// Waktu sekarang di WIB, misalnya "2026-11-14 22:30:05". Urutannya sama dengan urutan teks.
export function waktuKini(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA, dateStyle: "short", timeStyle: "medium" }).format(new Date());
}
