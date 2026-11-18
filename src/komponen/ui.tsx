import type { ReactNode } from "react";
import { PesanGalat } from "@/komponen/pesan-galat";
import { LABEL_STATUS, LABEL_TAHAP } from "@/lib/format";

export type Cari = Promise<Record<string, string | string[] | undefined>>;

export function nilai(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

// Label kecil di atas judul bagian. Garis di depannya elemen sungguhan (tidak memakai ::before) supaya ikut
// terbawa saat halaman diimpor ke Figma. Versi "terang" dipakai di atas blok teal.
export function LabelAtas({ children, terang }: { children: ReactNode; terang?: boolean }) {
  return (
    <p className={`flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.12em] ${terang ? "text-kunyit" : "text-terpal-gelap"}`}>
      <span aria-hidden className="h-0.5 w-5 shrink-0 bg-current" />
      {children}
    </p>
  );
}

export function Pesan({ galat, ok }: { galat?: string; ok?: string }) {
  if (galat) return <PesanGalat>{galat}</PesanGalat>;
  if (ok) {
    return (
      <p role="status" className="mb-4 rounded-md border border-rumput/40 bg-[#e3f2ea] px-4 py-3 text-sm font-medium text-rumput">
        {ok}
      </p>
    );
  }
  return null;
}

export function Kepala({ judul, ket, children }: { judul: string; ket?: string; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">{judul}</h1>
        {ket && <p className="mt-1 text-sm text-tinta-lembut">{ket}</p>}
      </div>
      {children && <div className="tanpa-cetak flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

const WARNA: Record<string, string> = {
  penawaran: "bg-[#fdf0d2] text-[#8a5d0b]",
  booking: "bg-[#dfe8fb] text-[#27468f]",
  berjalan: "bg-[#fde0da] text-terpal-gelap",
  selesai: "bg-[#dcefe5] text-rumput",
  menang: "bg-[#dcefe5] text-rumput",
  batal: "bg-[#e7e3da] text-tinta-lembut",
  kalah: "bg-[#e7e3da] text-tinta-lembut",
  baru: "bg-[#fde0da] text-terpal-gelap",
  dihubungi: "bg-[#dfe8fb] text-[#27468f]",
};

export function Lencana({ nilai: n, teks }: { nilai: string; teks?: string }) {
  return <span className={`lencana ${WARNA[n] ?? "bg-[#e7e3da] text-tinta"}`}>{teks ?? LABEL_STATUS[n] ?? LABEL_TAHAP[n] ?? n}</span>;
}

export function Bidang({ label, id, className, children }: { label: string; id: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

// Judul kartu dengan tombol aksi di kanannya, biasanya satu atau dua Panel.
export function JudulKartu({ judul, children }: { judul: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-bold">{judul}</h2>
      {children && <div className="tanpa-cetak flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Kosong({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-tinta-lembut">{children}</p>;
}
