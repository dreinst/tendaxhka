"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { rupiah } from "@/lib/format";
import { urutKategori } from "@/lib/kategori";
import { urlFoto } from "@/lib/hitung";

export type Barang = {
  id: number;
  nama: string;
  ukuran: string;
  kategori: string;
  satuan: string;
  harga: number;
  deskripsi: string;
  kapasitas: string;
  cocok: string;
  foto: string[];
};

// Pengganti netral selama barang belum punya foto.
function TanpaFoto({ kategori }: { kategori: string }) {
  return <span className="text-xs font-semibold uppercase tracking-wider text-tinta-lembut">{kategori}</span>;
}

// Foto bawaan (public/katalog) lewat komponen image Next. Foto unggahan dari /foto tetap <img>.
// Induknya harus relative dengan rasio tetap, supaya ruangnya sudah dipesan sebelum foto termuat.
function Foto({ berkas, alt, sizes }: { berkas: string; alt: string; sizes: string }) {
  const src = urlFoto(berkas);
  if (src.startsWith("/katalog/")) return <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className="absolute inset-0 size-full object-cover" />;
}

function Harga({ harga, satuan }: { harga: number; satuan: string }) {
  if (harga <= 0) return <p className="text-sm font-semibold">Harga lewat penawaran</p>;
  return (
    <p className="tabular-nums">
      <span className="text-base font-bold">{rupiah(harga)}</span>{" "}
      <span className="text-xs text-tinta-lembut">per {satuan} per hari</span>
    </p>
  );
}

const judul = (b: Barang) => [b.nama, b.ukuran].filter(Boolean).join(" ");
const batasi = (n: number, maks: number) => Math.min(Math.max(1, Math.floor(n) || 1), Math.max(1, maks));
const MAKS_JUMLAH = 999;

// Ragam "ringkas" dipakai di beranda: beberapa barang pertama tanpa saringan, dengan tautan ke katalog lengkap.
// Ragam "penuh" dipakai di halaman /produk dan menjadi judul utama halaman itu.
const JUMLAH_RINGKAS = 7;

export function Katalog({
  barang,
  wa,
  namaUsaha,
  ragam = "penuh",
  awal,
  tautanKontak = "#kontak",
}: {
  barang: Barang[];
  wa: string | null;
  namaUsaha: string;
  ragam?: "penuh" | "ringkas";
  awal?: string;
  tautanKontak?: string;
}) {
  const ringkas = ragam === "ringkas";
  const Judul = ringkas ? "h2" : "h1";
  const dialog = useRef<HTMLDialogElement>(null);
  const [saring, setSaring] = useState(awal || "Semua");
  const [pilih, setPilih] = useState<Barang | null>(null);
  const [fotoAktif, setFotoAktif] = useState(0);
  const [jumlah, setJumlah] = useState(1);
  const [hari, setHari] = useState(1);

  // Saat "Semua", tenda tampil lebih dulu lalu kategori lain menurut abjad. Urutan di dalam kategori tetap dari server.
  const kategori = urutKategori(barang.map((b) => b.kategori));
  const aktif = kategori.includes(saring) ? saring : "Semua";
  const tampil = barang
    .filter((b) => aktif === "Semua" || b.kategori === aktif)
    .sort((a, b) => kategori.indexOf(a.kategori) - kategori.indexOf(b.kategori))
    .slice(0, ringkas ? JUMLAH_RINGKAS : undefined);

  function buka(b: Barang) {
    setPilih(b);
    setFotoAktif(0);
    setJumlah(1);
    setHari(1);
    dialog.current?.showModal();
  }

  const j = pilih ? batasi(jumlah, MAKS_JUMLAH) : 1;
  const h = batasi(hari, 365);
  const pesanWa = pilih ? `Halo ${namaUsaha}, saya ingin tanya sewa ${judul(pilih)}, ${j} ${pilih.satuan} untuk ${h} hari.` : "";

  if (barang.length === 0) {
    return <p className="kartu p-5 text-sm text-tinta-lembut">Katalog sedang disiapkan. Tanyakan kebutuhan Anda lewat formulir di bawah.</p>;
  }
  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Judul className="text-2xl font-bold">Katalog produk</Judul>
          <p className="mt-1 max-w-[26rem] text-sm text-tinta-lembut">Harga per hari, belum termasuk antar, pasang, dan bongkar. Buka rincian untuk melihat foto dan menghitung perkiraan biaya.</p>
        </div>
        {ringkas ? (
          <a href="/produk" className="tombol self-start lg:self-auto">Lihat semua {barang.length} produk</a>
        ) : (
          <div className="flex flex-wrap gap-1.5 lg:justify-end" role="group" aria-label="Saring kategori">
            {["Semua", ...kategori].map((k) => (
              <button key={k} type="button" aria-pressed={aktif === k} onClick={() => setSaring(k)} className="chip">
                {k} <span className="font-medium tabular-nums opacity-70">{k === "Semua" ? barang.length : barang.filter((b) => b.kategori === k).length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Flex dipakai supaya kartu ajakan di akhir bisa mengisi sisa baris terakhir, berapa pun jumlah barangnya. */}
      <ul className="mt-4 flex flex-wrap gap-3 md:gap-4">
        {tampil.map((b) => (
          <li
            key={b.id}
            className="kartu relative flex shrink-0 grow-0 basis-[calc((100%-0.75rem)/2)] md:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-3rem)/4)] flex-col overflow-hidden hover:border-[#b9b5ac] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tinta"
          >
            <div className="relative grid aspect-[4/3] place-items-center overflow-hidden border-b border-garis bg-[#ece9e3]">
              {b.foto.length > 0 ? (
                <Foto berkas={b.foto[0]} alt={`Foto ${judul(b)}`} sizes="(min-width: 1280px) 300px, (min-width: 768px) 30vw, 46vw" />
              ) : (
                <TanpaFoto kategori={b.kategori} />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <h3 className="text-[15px] font-semibold leading-snug">
                {b.nama} {b.ukuran && <span className="font-normal text-tinta-lembut">{b.ukuran}</span>}
              </h3>
              {b.deskripsi && <p className="line-clamp-2 flex-1 text-[13px] leading-snug text-tinta-lembut">{b.deskripsi}</p>}
              <Harga harga={b.harga} satuan={b.satuan} />
              {/* Satu-satunya perhentian tab di kartu. Lapisan after memperluas area klik ke seluruh kartu. */}
              <button
                type="button"
                onClick={() => buka(b)}
                aria-label={`Lihat rincian ${judul(b)}`}
                className="inline-flex min-h-10 cursor-pointer items-center self-start text-sm font-semibold text-terpal-gelap underline-offset-2 outline-none after:absolute after:inset-0 after:content-[''] hover:underline"
              >
                Rincian
              </button>
            </div>
          </li>
        ))}
        <li className="flex grow basis-[calc((100%-0.75rem)/2)] md:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-3rem)/4)] flex-col justify-center gap-2 rounded-md bg-tinta p-4 text-white md:p-5">
          {ringkas ? (
            <>
              <p className="font-judul text-lg font-semibold leading-snug">Ada {barang.length} produk di katalog</p>
              <p className="text-sm text-white/80">Lihat semuanya per kategori, lengkap dengan foto, ukuran, dan harga sewa per hari.</p>
              <a href="/produk" className="tombol mt-1 self-start">Buka katalog produk</a>
            </>
          ) : (
            <>
              <p className="font-judul text-lg font-semibold leading-snug">Butuh barang yang tidak ada di daftar?</p>
              <p className="text-sm text-white/80">Tulis kebutuhannya di formulir. Kami cek ketersediaannya lalu memasukkannya ke penawaran.</p>
              <a href={tautanKontak} className="tombol tombol-utama mt-1 self-start">Minta penawaran</a>
            </>
          )}
        </li>
      </ul>

      <dialog
        ref={dialog}
        aria-labelledby="rincian-judul"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        onClose={() => setPilih(null)}
        className="m-auto w-full max-w-[860px] rounded-lg bg-white p-0 text-tinta shadow-2xl backdrop:bg-tinta/55 max-sm:max-w-[calc(100vw-24px)]"
      >
        {pilih && (
          <div className="relative grid md:grid-cols-[1.1fr_1fr]">
            <button type="button" onClick={() => dialog.current?.close()} className="tombol absolute right-2 top-2 z-10">
              Tutup
            </button>
            <div className="grid content-start gap-2 bg-kertas p-3">
              <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-md bg-[#ece9e3]">
                {pilih.foto.length > 0 ? (
                  <Foto
                    key={pilih.foto[fotoAktif] ?? pilih.foto[0]}
                    berkas={pilih.foto[fotoAktif] ?? pilih.foto[0]}
                    alt={`Foto ${judul(pilih)} nomor ${fotoAktif + 1}`}
                    sizes="(min-width: 860px) 460px, 90vw"
                  />
                ) : (
                  <TanpaFoto kategori={pilih.kategori} />
                )}
              </div>
              {pilih.foto.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {pilih.foto.map((f, i) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFotoAktif(i)}
                      aria-label={`Foto ${i + 1}`}
                      aria-current={i === fotoAktif}
                      className={`relative h-12 w-16 overflow-hidden rounded border-2 ${i === fotoAktif ? "border-terpal" : "border-transparent"}`}
                    >
                      <Foto berkas={f} alt="" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid min-w-0 content-start gap-3 p-5">
              <h3 id="rincian-judul" className="pr-16 text-lg font-bold">{judul(pilih)}</h3>
              {pilih.deskripsi && <p className="text-sm text-tinta-lembut">{pilih.deskripsi}</p>}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {(
                  [
                    ["Ukuran", pilih.ukuran],
                    ["Kapasitas", pilih.kapasitas],
                    ["Cocok untuk", pilih.cocok],
                    ["Harga", pilih.harga > 0 ? `${rupiah(pilih.harga)} per ${pilih.satuan} per hari` : "Lewat penawaran"],
                  ] as const
                )
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="font-semibold text-tinta-lembut">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
              <div className="ceruk grid gap-2 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label" htmlFor="hitung-jumlah">Jumlah ({pilih.satuan})</label>
                    <input className="isian" id="hitung-jumlah" type="number" inputMode="numeric" min={1} max={MAKS_JUMLAH} value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="label" htmlFor="hitung-hari">Lama sewa (hari)</label>
                    <input className="isian" id="hitung-hari" type="number" inputMode="numeric" min={1} value={hari} onChange={(e) => setHari(Number(e.target.value))} />
                  </div>
                </div>
                <div>
                  <span className="label">Perkiraan biaya sewa, belum termasuk antar dan pasang</span>
                  <output htmlFor="hitung-jumlah hitung-hari" className="text-lg font-bold tabular-nums">
                    {pilih.harga > 0 ? rupiah(j * h * pilih.harga) : "Lewat penawaran"}
                  </output>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {wa ? (
                  <a href={`https://wa.me/${wa}?text=${encodeURIComponent(pesanWa)}`} target="_blank" rel="noopener noreferrer" className="tombol tombol-utama">
                    Tanya lewat WhatsApp
                  </a>
                ) : (
                  <a href={tautanKontak} onClick={() => dialog.current?.close()} className="tombol tombol-utama">
                    Minta penawaran
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
