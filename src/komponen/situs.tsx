import Link from "next/link";

// Tautan chat WhatsApp dengan pesan pembuka yang sudah terisi.
export function tautanWa(nomor: string, pesan: string): string {
  return `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;
}

// Kepala yang sama untuk beranda dan halaman katalog. Navigasinya hanya memuat tujuan yang memang halaman lain.
export function KepalaSitus({ nama, wa, sapa, aktif }: { nama: string; wa: string | null; sapa: string; aktif?: "produk" }) {
  return (
    <>
      <a href="#utama" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Langsung ke isi
      </a>
      <header className="sticky top-0 z-40 border-b border-garis bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" className="inline-flex min-h-10 items-center font-judul text-base font-bold tracking-tight">{nama}</Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <nav aria-label="Utama" className="text-sm font-medium">
              <Link
                href="/produk"
                aria-current={aktif === "produk" ? "page" : undefined}
                className="inline-flex min-h-10 items-center px-1 hover:text-terpal-gelap aria-[current=page]:font-semibold aria-[current=page]:text-terpal-gelap"
              >
                Katalog<span className="hidden sm:inline">&nbsp;produk</span>
              </Link>
            </nav>
            {wa && (
              <a href={tautanWa(wa, sapa)} target="_blank" rel="noopener noreferrer" className="tombol hidden sm:inline-flex">
                Chat WhatsApp
              </a>
            )}
            <Link href="/#kontak" className="tombol tombol-utama">Minta penawaran</Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function KakiSitus({ nama, telepon }: { nama: string; telepon: string }) {
  return (
    <footer className="border-t border-garis">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-[13px] text-tinta-lembut">
        <p>{nama}</p>
        {telepon && <p>{telepon}</p>}
        <Link href="/kredit-foto" className="inline-flex min-h-10 items-center underline underline-offset-2 hover:text-tinta">Kredit foto</Link>
      </div>
    </footer>
  );
}
