import type { Metadata } from "next";
import Link from "next/link";
import { KREDIT_FOTO } from "@/lib/kredit-foto";

export const metadata: Metadata = { title: "Kredit foto" };

export default function KreditFoto() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm font-semibold underline underline-offset-2">Kembali ke beranda</Link>
      <h1 className="mt-4 text-2xl font-bold md:text-3xl">Kredit foto</h1>
      <p className="mt-3 text-tinta-lembut">
        Foto di website ini adalah foto ilustrasi dari fotografer lain, bukan dokumentasi acara Tenda Indonesia. Wujud barang yang disewakan bisa berbeda.
        Terima kasih kepada para pembuat foto di bawah.
      </p>
      <ul className="mt-8 grid gap-3">
        {KREDIT_FOTO.map((f) => (
          <li key={f.berkas} className="kartu p-4">
            <h2 className="font-isi text-base font-bold">{f.barang}</h2>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="font-semibold text-tinta-lembut">Pembuat</dt>
              <dd>{f.pembuat}</dd>
              <dt className="font-semibold text-tinta-lembut">Lisensi</dt>
              <dd>{f.lisensi}</dd>
              <dt className="font-semibold text-tinta-lembut">Sumber</dt>
              <dd className="min-w-0 break-words">
                <a href={f.halaman} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {f.halaman}
                </a>
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </main>
  );
}
