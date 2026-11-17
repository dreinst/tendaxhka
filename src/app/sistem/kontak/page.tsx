import type { Metadata } from "next";
import Link from "next/link";
import { FormKontak } from "@/komponen/formulir";
import { Kepala, nilai, Pesan, type Cari } from "@/komponen/ui";
import { ubahTahap } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import type { Kontak } from "@/lib/data";
import { semua } from "@/lib/db";
import { hariIni, LABEL_TAHAP, tanggal } from "@/lib/format";
import { boleh } from "@/lib/hitung";

export const metadata: Metadata = { title: "CRM" };

export default async function HalamanKontak({ searchParams }: { searchParams: Cari }) {
  const u = await wajib("kontak.lihat");
  const tulis = boleh(u.peran, "kontak.tulis");
  const galat = nilai((await searchParams).galat);
  const hari = hariIni();
  // Yang tindak lanjutnya paling dekat tampil paling atas di tiap kolom.
  const kontak = await semua<Kontak>("SELECT * FROM kontak ORDER BY COALESCE(tindak_lanjut, '9999') ASC, id DESC LIMIT 300");
  return (
    <>
      <Kepala judul="CRM" ket="Lead dan pelanggan per tahap. Permintaan dari website masuk ke kolom Baru." />
      <Pesan galat={galat} />
      {tulis && (
        <details className="kartu mb-5 p-4">
          <summary className="cursor-pointer text-sm font-bold">Tambah kontak</summary>
          <div className="mt-4">
            <FormKontak />
          </div>
        </details>
      )}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Object.entries(LABEL_TAHAP).map(([t, label]) => {
          const isi = kontak.filter((k) => k.tahap === t);
          return (
            <section key={t} aria-label={label} className="ceruk p-2">
              <h2 className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide">
                {label} <span className="text-tinta-lembut">{isi.length}</span>
              </h2>
              <ul className="space-y-2">
                {isi.map((k) => (
                  <li key={k.id} className="kartu p-3 text-sm">
                    <Link href={`/sistem/kontak/${k.id}`} className="font-semibold underline-offset-2 hover:underline">
                      {k.nama}
                    </Link>
                    {k.perusahaan && <p className="text-xs text-tinta-lembut">{k.perusahaan}</p>}
                    {k.telepon && <p className="text-xs">{k.telepon}</p>}
                    {k.tindak_lanjut && t !== "menang" && t !== "kalah" && (
                      <p className={`mt-1 text-xs font-semibold ${k.tindak_lanjut <= hari ? "text-terpal-gelap" : "text-tinta-lembut"}`}>
                        Tindak lanjut {tanggal(k.tindak_lanjut)}
                      </p>
                    )}
                    {tulis && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-tinta-lembut">Pindah tahap</summary>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Object.entries(LABEL_TAHAP).filter(([v]) => v !== t).map(([v, teks]) => (
                            <form key={v} action={ubahTahap.bind(null, k.id, v)}>
                              <button className="tombol tombol-kecil">{teks}</button>
                            </form>
                          ))}
                        </div>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
