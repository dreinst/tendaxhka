import Link from "next/link";
import { LambangTenda } from "@/komponen/ikon";

// Tautan chat WhatsApp dengan pesan pembuka yang sudah terisi.
export function tautanWa(nomor: string, pesan: string): string {
  return `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;
}

// Kepala yang sama untuk semua halaman publik. Navigasinya hanya memuat tujuan yang memang halaman lain.
export function KepalaSitus({ nama, wa, sapa, aktif }: { nama: string; wa: string | null; sapa: string; aktif?: "produk" }) {
  return (
    <>
      <a href="#utama" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Langsung ke isi
      </a>
      <header className="sticky top-0 z-40 border-b border-garis bg-kanvas">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2.5">
            <LambangTenda className="shrink-0" />
            <span className="whitespace-nowrap font-judul text-base font-bold tracking-tight sm:text-[17px]">{nama}</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Di layar yang sangat sempit tautan katalog disembunyikan supaya nama usaha tidak terpotong. Tautan yang sama ada di hero. */}
            <nav aria-label="Utama" className="text-sm font-semibold max-[379px]:hidden">
              <Link
                href="/produk"
                aria-current={aktif === "produk" ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-lg px-2 hover:bg-kertas aria-[current=page]:text-terpal-gelap sm:px-2.5"
              >
                Katalog<span className="hidden sm:inline">&nbsp;produk</span>
              </Link>
            </nav>
            {wa && (
              <a href={tautanWa(wa, sapa)} target="_blank" rel="noopener noreferrer" className="tombol hidden min-h-11 md:inline-flex">
                Chat WhatsApp
              </a>
            )}
            <Link href="/#kontak" className="tombol tombol-utama min-h-11">
              <span className="sm:hidden">Penawaran</span>
              <span className="hidden sm:inline">Minta penawaran</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

const JELAJAH = [
  ["/produk", "Katalog produk"],
  ["/#cara-sewa", "Cara sewa"],
  ["/#kontak", "Minta penawaran"],
  ["/kredit-foto", "Kredit foto"],
];

export function KakiSitus({ nama, telepon, email, alamat }: { nama: string; telepon: string; email: string; alamat: string }) {
  const kontak = [telepon, email, alamat].filter(Boolean);
  return (
    <footer className="bg-tinta-pekat text-white">
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-6 px-4 py-8 md:grid-cols-[1.3fr_1.2fr_1.1fr]">
        <div>
          <p className="flex items-center gap-2.5">
            <LambangTenda terang className="shrink-0" />
            <span className="font-judul text-[17px] font-bold tracking-tight">{nama}</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-white/70">Rental tenda dan perlengkapan acara, diantar, dipasang, dan dibongkar oleh tim sendiri.</p>
        </div>
        <nav aria-label="Jelajahi">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-kunyit">Jelajahi</p>
          <ul className="mt-1 grid grid-cols-2 gap-x-6 text-sm">
            {JELAJAH.map(([href, teks]) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-10 items-center text-white/85 underline-offset-4 hover:text-white hover:underline">
                  {teks}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-kunyit">Kontak</p>
          {kontak.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-white/85">
              {kontak.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/70">Kirim kebutuhan lewat formulir penawaran, kami yang menghubungi Anda.</p>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-3.5 text-xs text-white/60">
          {nama}. Foto di situs ini adalah foto ilustrasi, wujud barang bisa berbeda.
        </p>
      </div>
    </footer>
  );
}
