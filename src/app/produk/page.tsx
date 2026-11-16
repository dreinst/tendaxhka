import type { Metadata } from "next";
import Link from "next/link";
import { Katalog } from "@/komponen/katalog";
import { KakiSitus, KepalaSitus } from "@/komponen/situs";
import { nilai, type Cari } from "@/komponen/ui";
import { barangKatalog, identitasSitus } from "@/lib/katalog-data";

export const metadata: Metadata = {
  title: "Katalog produk",
  description: "Daftar tenda dan perlengkapan acara yang disewakan, lengkap dengan ukuran dan harga sewa per hari.",
};

// Katalog dibaca dari basis data, jadi perubahan dari halaman admin langsung tampil.
export const dynamic = "force-dynamic";

export default async function Produk({ searchParams }: { searchParams: Cari }) {
  const { s, wa, sapa } = identitasSitus();
  const barang = barangKatalog();
  return (
    <>
      <KepalaSitus nama={s.nama_usaha} wa={wa} sapa={sapa} aktif="produk" />
      <main id="utama">
        <section className="mx-auto max-w-7xl px-4 py-6 md:py-8">
          <Katalog barang={barang} wa={wa} namaUsaha={s.nama_usaha} ragam="penuh" awal={nilai((await searchParams).kategori)} tautanKontak="/#kontak" />
          <p className="mt-4 text-xs text-tinta-lembut">Foto di katalog adalah foto ilustrasi, wujud barang bisa berbeda.</p>
        </section>
        <section className="border-t border-garis bg-kertas">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5">
            <div>
              <h2 className="text-lg font-bold">Sudah tahu yang dibutuhkan?</h2>
              <p className="text-sm text-tinta-lembut">Kirim tanggal dan lokasi acara. Kami cek ketersediaannya lalu mengirim penawaran.</p>
            </div>
            <Link href="/#kontak" className="tombol tombol-utama px-5">Minta penawaran</Link>
          </div>
        </section>
      </main>
      <KakiSitus nama={s.nama_usaha} telepon={s.telepon} />
    </>
  );
}
