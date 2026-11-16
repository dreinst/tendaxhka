import type { Metadata } from "next";
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
        <Katalog barang={barang} wa={wa} namaUsaha={s.nama_usaha} ragam="penuh" awal={nilai((await searchParams).kategori)} tautanKontak="/#kontak" />
      </main>
      <KakiSitus nama={s.nama_usaha} telepon={s.telepon} email={s.email} alamat={s.alamat} />
    </>
  );
}
