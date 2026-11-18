import type { Metadata } from "next";
import Link from "next/link";
import { FormKontak } from "@/komponen/formulir";
import { Panel } from "@/komponen/panel";
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
      <Kepala judul="CRM" ket="Lead dan pelanggan per tahap. Permintaan dari website masuk ke kolom Baru.">
        {tulis && (
          <Panel tombol="Tambah kontak" kelasTombol="tombol tombol-utama" judul="Tambah kontak" lebar="lebar">
            <FormKontak />
          </Panel>
        )}
      </Kepala>
      <Pesan galat={galat} />
      {/* items-start: tiap kolom setinggi isinya sendiri, tidak ikut memanjang setinggi kolom terpanjang. */}
      <div className="grid items-start gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Object.entries(LABEL_TAHAP).map(([t, label]) => {
          const isi = kontak.filter((k) => k.tahap === t);
          return (
            <section key={t} aria-label={label} className="ceruk p-2">
              <h2 className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide">
                {label} <span className="text-tinta-lembut">{isi.length}</span>
              </h2>
              <ul className="space-y-2">
                {isi.map((k) => (
                  <li key={k.id} className="kartu px-3 py-1.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-x-2">
                      <Link href={`/sistem/kontak/${k.id}`} className="inline-flex min-h-11 items-center font-semibold underline-offset-2 hover:underline">
                        {k.nama}
                      </Link>
                      {tulis && (
                        <Panel
                          tombol="Pindah"
                          labelTombol={`Pindah tahap ${k.nama}`}
                          kelasTombol="tombol-teks"
                          judul={`Pindah tahap ${k.nama}`}
                          ket={`Sekarang di tahap ${label}.`}
                        >
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(LABEL_TAHAP)
                              .filter(([v]) => v !== t)
                              .map(([v, teks]) => (
                                <form key={v} action={ubahTahap.bind(null, k.id, v)}>
                                  <button className="tombol min-h-11 w-full">{teks}</button>
                                </form>
                              ))}
                          </div>
                        </Panel>
                      )}
                    </div>
                    <div className="pb-1.5">
                      {k.perusahaan && <p className="text-xs text-tinta-lembut">{k.perusahaan}</p>}
                      {k.telepon && <p className="text-xs">{k.telepon}</p>}
                      {k.tindak_lanjut && t !== "menang" && t !== "kalah" && (
                        <p className={`mt-1 text-xs font-semibold ${k.tindak_lanjut <= hari ? "text-terpal-gelap" : "text-tinta-lembut"}`}>
                          Tindak lanjut {tanggal(k.tindak_lanjut)}
                        </p>
                      )}
                    </div>
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
