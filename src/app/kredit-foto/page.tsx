import type { Metadata } from "next";
import Link from "next/link";
import { KakiSitus, KepalaSitus } from "@/komponen/situs";
import { identitasSitus } from "@/lib/katalog-data";
import { KREDIT_FOTO } from "@/lib/kredit-foto";

export const metadata: Metadata = { title: "Kredit foto" };

// Kepala dan kaki halaman membaca identitas usaha dari basis data.
export const dynamic = "force-dynamic";

export default async function KreditFoto() {
  const { s, wa, sapa } = await identitasSitus();
  return (
    <>
      <KepalaSitus nama={s.nama_usaha} wa={wa} sapa={sapa} />
      <main id="utama">
        <div className="border-b border-garis bg-kertas">
          <div className="mx-auto max-w-7xl px-4 py-7 md:py-9">
            <nav aria-label="Jejak halaman" className="text-[13px] text-tinta-lembut">
              <Link href="/" className="inline-flex min-h-10 items-center underline-offset-4 hover:underline">Beranda</Link>
              <span aria-hidden className="mx-2">/</span>
              <span aria-current="page" className="font-semibold text-tinta">Kredit foto</span>
            </nav>
            <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em] md:text-[40px]">Kredit foto</h1>
            <p className="mt-2 max-w-2xl text-sm text-tinta-lembut md:text-[15px]">
              Foto di website ini adalah foto ilustrasi karya fotografer lain. Semuanya dipakai sebagai gambaran, dan wujud barang yang disewakan
              bisa berbeda. Terima kasih kepada para pembuat foto di bawah.
            </p>
          </div>
        </div>
        <ul className="mx-auto grid max-w-7xl gap-3 px-4 py-7 md:grid-cols-2 md:py-9 lg:grid-cols-3">
          {KREDIT_FOTO.map((f) => (
            <li key={f.berkas} className="kartu p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-tinta-lembut">{f.barang}</p>
              <h2 className="mt-2 font-isi text-base font-semibold tracking-normal">Foto oleh {f.pembuat}</h2>
              <p className="mt-1 text-sm text-tinta-lembut">
                <a href={f.tautanLisensi} target="_blank" rel="noopener noreferrer" className="font-medium text-tinta underline underline-offset-4">{f.lisensi}</a>. {f.ubahan}.
              </p>
              <a href={f.halaman} target="_blank" rel="noopener noreferrer" aria-label={`Halaman sumber foto: ${f.barang}`} className="mt-1 inline-flex min-h-10 items-center text-sm font-medium text-terpal-gelap underline underline-offset-4">
                Halaman sumber
              </a>
            </li>
          ))}
        </ul>
      </main>
      <KakiSitus nama={s.nama_usaha} telepon={s.telepon} email={s.email} alamat={s.alamat} />
    </>
  );
}
