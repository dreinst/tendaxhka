"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { IkonPanah, IkonTutup } from "@/komponen/ikon";
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

// Pengganti selama barang belum punya foto. Lambang tenda bergaris membuatnya terlihat sengaja, tidak seperti
// gambar yang gagal dimuat.
function TanpaFoto() {
  return (
    <span className="grid justify-items-center gap-2 text-xs font-semibold text-tinta-lembut">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
        <path d="M20 7 35 31H5z" stroke="#cdbfa8" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M20 18.5 25.5 31h-11z" fill="#cdbfa8" />
      </svg>
      Foto menyusul
    </span>
  );
}

// Foto bawaan (public/katalog) lewat komponen image Next. Foto unggahan dari /foto tetap <img>.
// Induknya harus relative dengan rasio tetap, supaya ruangnya sudah dipesan sebelum foto termuat.
// "utama" dipakai untuk foto yang langsung terlihat saat halaman dibuka, supaya dimuat lebih dulu.
function Foto({ berkas, alt, sizes, utama }: { berkas: string; alt: string; sizes: string; utama?: boolean }) {
  const src = urlFoto(berkas);
  if (src.startsWith("/katalog/")) return <Image src={src} alt={alt} fill sizes={sizes} preload={utama} className="object-cover" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={utama ? "eager" : "lazy"} className="absolute inset-0 size-full object-cover" />;
}

function Harga({ harga, satuan }: { harga: number; satuan: string }) {
  if (harga <= 0) return <p className="text-sm font-semibold">Harga lewat penawaran</p>;
  return (
    <p className="tabular-nums leading-tight">
      <span className="block font-judul text-[17px] font-bold text-terpal">{rupiah(harga)}</span>
      <span className="block text-xs text-tinta-lembut">per {satuan} per hari</span>
    </p>
  );
}

const judul = (b: Barang) => [b.nama, b.ukuran].filter(Boolean).join(" ");
const batasi = (n: number, maks: number) => Math.min(Math.max(1, Math.floor(n) || 1), Math.max(1, maks));
const MAKS_JUMLAH = 999;

// Ragam "ringkas" dipakai di beranda: beberapa barang pertama tanpa saringan, dengan tautan ke katalog lengkap.
// Ragam "penuh" dipakai di halaman /produk dan menjadi judul utama halaman itu.
const JUMLAH_RINGKAS = 7;
// Dua kolom di HP, tiga di tablet, empat di layar lebar. Lebarnya dihitung dari jarak antarkartu.
const LEBAR_KARTU = "basis-[calc((100%-0.75rem)/2)] md:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-3rem)/4)]";
const KETERANGAN = "Harga per hari, belum termasuk antar, pasang, dan bongkar. Buka rincian untuk melihat foto dan menghitung perkiraan biaya.";

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
  // Di beranda kartu berada di bawah judul bagian (h2), di halaman katalog langsung di bawah judul halaman (h1).
  const JudulKartu = ringkas ? "h3" : "h2";
  const dialog = useRef<HTMLDialogElement>(null);
  const [saring, setSaring] = useState(awal || "Semua");
  const [pilih, setPilih] = useState<Barang | null>(null);
  const [fotoAktif, setFotoAktif] = useState(0);
  const [jumlah, setJumlah] = useState(1);
  const [hari, setHari] = useState(1);

  // Saat "Semua", tenda tampil lebih dulu lalu kategori lain menurut abjad. Urutan di dalam kategori tetap dari server.
  const kategori = urutKategori(barang.map((b) => b.kategori));
  const aktif = kategori.includes(saring) ? saring : "Semua";
  const urut = barang
    .filter((b) => aktif === "Semua" || b.kategori === aktif)
    .sort((a, b) => kategori.indexOf(a.kategori) - kategori.indexOf(b.kategori));
  const tampil = ringkas ? urut.slice(0, JUMLAH_RINGKAS) : urut;
  // Barang yang tidak muat di ringkasan beranda disebut namanya di kartu ajakan.
  const sisa = ringkas ? urut.slice(JUMLAH_RINGKAS) : [];
  // Di HP kartu tersusun dua kolom. Kalau jumlahnya ganjil, kartu terakhir sebaris dengan kartu ajakan yang lebih tinggi
  // dan menyisakan ruang kosong. Jadi di HP kartu itu disembunyikan dan barangnya disebut di kartu ajakan.
  const ganjil = ringkas && tampil.length >= 3 && tampil.length % 2 === 1 ? tampil[tampil.length - 1] : null;
  // Baris di kartu ajakan ikut meregang (flex-1) supaya daftar mengisi tinggi kartu saat kartu di sebelahnya lebih tinggi.
  // Baris kedua (kategori dan satuan) hanya tampil mulai layar sm, karena di HP kartunya selebar layar dan cukup satu baris.
  const barisSisa = (b: Barang, kelas = "") => (
    <li key={b.id} className={`flex flex-1 flex-col justify-center py-2.5 ${kelas}`}>
      <div className="flex items-baseline justify-between gap-x-3">
        <span className="min-w-0">
          <span className="block font-medium">{b.nama}</span>
          <span className="block text-xs text-white/75 max-sm:hidden">{b.kategori}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-semibold tabular-nums">{b.harga > 0 ? rupiah(b.harga) : "Lewat penawaran"}</span>
          {b.harga > 0 && (
            <span className="block text-xs text-white/75 max-sm:hidden">
              per {b.satuan} per hari
            </span>
          )}
        </span>
      </div>
    </li>
  );

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

  const daftar =
    barang.length === 0 ? (
      <p className="kartu p-5 text-sm text-tinta-lembut">Katalog sedang disiapkan. Tanyakan kebutuhan Anda lewat formulir penawaran.</p>
    ) : (
      <>
        {/* Flex dipakai supaya kartu ajakan di akhir bisa mengisi sisa baris terakhir, berapa pun jumlah barangnya. */}
        <ul className="flex flex-wrap gap-3 md:gap-4">
          {tampil.map((b, i) => (
            <li
              key={b.id}
              className={`group relative flex shrink-0 grow-0 flex-col overflow-hidden rounded-xl border border-garis bg-white shadow-[0_1px_2px_rgb(14_49_56/0.05)] transition-shadow duration-200 hover:border-garis-kuat hover:shadow-[0_10px_24px_-14px_rgb(14_49_56/0.35)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-terpal ${LEBAR_KARTU} ${b === ganjil ? "max-sm:hidden" : ""}`}
            >
              <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-kertas">
                {b.foto.length > 0 ? (
                  <Foto berkas={b.foto[0]} alt={`Foto ${judul(b)}`} sizes="(min-width: 1280px) 300px, (min-width: 768px) 30vw, 46vw" utama={!ringkas && i < 4} />
                ) : (
                  <TanpaFoto />
                )}
                <span className="absolute left-2.5 top-2.5 rounded-md bg-white px-2 py-1 text-xs font-semibold leading-none text-tinta shadow-sm">{b.kategori}</span>
              </div>
              <div className="flex flex-1 flex-col p-3 sm:p-3.5">
                <JudulKartu className="text-[15px] font-semibold leading-snug sm:text-base">{b.nama}</JudulKartu>
                {b.ukuran && <p className="text-[13px] text-tinta-lembut">{b.ukuran}</p>}
                {/* Di HP kartunya sempit dan deskripsi terpotong di tengah kalimat, jadi hanya tampil di layar lebih lebar. */}
                {b.deskripsi && <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-tinta-lembut max-sm:hidden">{b.deskripsi}</p>}
                <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-3">
                  <Harga harga={b.harga} satuan={b.satuan} />
                  {/* Satu-satunya perhentian tab di kartu. Lapisan after memperluas area klik ke seluruh kartu. */}
                  <button
                    type="button"
                    onClick={() => buka(b)}
                    aria-label={`Lihat rincian ${judul(b)}`}
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1 text-[13px] font-semibold text-tinta outline-none transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-terpal-gelap"
                  >
                    Rincian
                    <IkonPanah className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}

          {ringkas ? (
            <li className={`flex min-w-0 grow flex-col gap-4 rounded-xl bg-tinta p-4 text-white sm:p-5 ${LEBAR_KARTU}`}>
              <p className="font-judul text-lg font-bold leading-tight sm:text-[22px]">{sisa.length > 0 ? "Juga ada di katalog" : `Ada ${barang.length} produk di katalog`}</p>
              {(sisa.length > 0 || ganjil) && (
                <ul className={`flex flex-1 flex-col divide-y divide-white/15 border-y border-white/15 text-sm ${sisa.length === 0 ? "sm:hidden" : ""}`}>
                  {ganjil && barisSisa(ganjil, "sm:hidden")}
                  {sisa.slice(0, 3).map((b) => barisSisa(b))}
                </ul>
              )}
              {sisa.length > 3 && <p className="text-sm text-white/75">dan {sisa.length - 3} produk lain</p>}
              <Link href="/produk" className="tombol mt-auto self-start whitespace-nowrap max-sm:w-full max-sm:px-2.5">
                Buka katalog
                <IkonPanah />
              </Link>
            </li>
          ) : (
            // Kalau kartu ini cukup lebar (mengisi dua kolom atau lebih), sisi kanannya diisi foto.
            <li className={`@container flex min-w-0 grow overflow-hidden rounded-xl bg-tinta text-white ${LEBAR_KARTU}`}>
              <div className="flex w-full flex-col @lg:flex-row">
                <div className="flex flex-1 flex-col justify-between gap-5 p-4 sm:p-5">
                  <div>
                    <p className="font-judul text-xl font-bold leading-tight sm:text-[22px]">Tidak menemukan yang dicari?</p>
                    <p className="mt-2 text-sm text-white/75">Tulis kebutuhannya di formulir penawaran. Kami cek ketersediaannya lalu memasukkannya ke penawaran.</p>
                  </div>
                  <Link href={tautanKontak} className="tombol tombol-utama self-start whitespace-nowrap max-sm:w-full max-sm:px-2.5">
                    Minta penawaran
                    <IkonPanah />
                  </Link>
                </div>
                <div className="relative hidden min-h-[200px] flex-1 @lg:block">
                  <Image src="/katalog/15-terpasang.jpg" alt="" fill sizes="320px" className="object-cover" />
                </div>
              </div>
            </li>
          )}
        </ul>
        <p className="mt-4 text-xs text-tinta-lembut">Foto di katalog adalah foto ilustrasi, wujud barang bisa berbeda.</p>
      </>
    );

  return (
    <>
      {ringkas ? (
        <div className="mx-auto max-w-7xl px-4 py-9 lg:py-12">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[26px] font-bold md:text-[32px]">Tenda dan perlengkapan yang bisa disewa</h2>
              <p className="mt-2 max-w-xl text-sm text-tinta-lembut md:text-[15px]">{KETERANGAN}</p>
            </div>
            {/* Di HP pita kategori dan kartu ajakan sudah menaut ke katalog, jadi tombol ini hanya untuk layar lebar. */}
            {barang.length > 0 && (
              <Link href="/produk" className="tombol tombol-garis min-h-11 self-start whitespace-nowrap max-md:hidden md:self-auto">
                Lihat semua {barang.length} produk
                <IkonPanah />
              </Link>
            )}
          </div>
          {daftar}
        </div>
      ) : (
        <>
          <div className="border-b border-garis bg-kertas">
            <div className="mx-auto max-w-7xl px-4 py-7 md:py-9">
              <nav aria-label="Jejak halaman" className="text-[13px] text-tinta-lembut">
                <Link href="/" className="inline-flex min-h-10 items-center underline-offset-4 hover:underline">Beranda</Link>
                <span aria-hidden className="mx-2">/</span>
                <span aria-current="page" className="font-semibold text-tinta">Katalog produk</span>
              </nav>
              <h1 className="mt-1 text-[30px] font-bold tracking-[-0.03em] md:text-[40px]">Katalog produk</h1>
              <p className="mt-2 max-w-2xl text-sm text-tinta-lembut md:text-[15px]">{KETERANGAN}</p>
              {barang.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Saring kategori">
                  {["Semua", ...kategori].map((k) => (
                    <button key={k} type="button" aria-pressed={aktif === k} onClick={() => setSaring(k)} className="chip group">
                      {k}
                      <span className="rounded bg-kertas px-1.5 py-0.5 text-xs font-semibold leading-none tabular-nums text-tinta group-aria-pressed:bg-white/20 group-aria-pressed:text-white">
                        {k === "Semua" ? barang.length : barang.filter((b) => b.kategori === k).length}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-7 md:py-9">{daftar}</div>
        </>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="rincian-judul"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        onClose={() => setPilih(null)}
        className="m-auto max-h-[calc(100dvh-24px)] w-full max-w-[900px] overflow-x-hidden overflow-y-auto rounded-2xl bg-white p-0 text-tinta shadow-2xl backdrop:bg-tinta-pekat/60 max-sm:max-w-[calc(100vw-24px)]"
      >
        {pilih && (
          <div className="relative grid md:grid-cols-[1.05fr_1fr]">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Tutup rincian"
              className="absolute right-3 top-3 z-10 grid size-10 cursor-pointer place-items-center rounded-full border border-garis bg-white text-tinta shadow-sm hover:bg-kertas"
            >
              <IkonTutup />
            </button>
            {/* Di HP foto menempel ke tepi dialog. Di layar lebar foto mengisi seluruh tinggi kolom kiri. */}
            <div className="flex flex-col gap-2.5 bg-kertas md:p-4">
              <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-kertas md:aspect-auto md:min-h-[320px] md:flex-1 md:rounded-xl">
                {pilih.foto.length > 0 ? (
                  <Foto
                    key={pilih.foto[fotoAktif] ?? pilih.foto[0]}
                    berkas={pilih.foto[fotoAktif] ?? pilih.foto[0]}
                    alt={`Foto ${judul(pilih)} nomor ${fotoAktif + 1}`}
                    sizes="(min-width: 900px) 460px, 90vw"
                    utama
                  />
                ) : (
                  <TanpaFoto />
                )}
              </div>
              {pilih.foto.length > 1 && (
                <div className="flex flex-wrap gap-2 px-3 pb-3 md:p-0">
                  {pilih.foto.map((f, i) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFotoAktif(i)}
                      aria-label={`Foto ${i + 1}`}
                      aria-current={i === fotoAktif}
                      className={`relative h-12 w-16 cursor-pointer overflow-hidden rounded-md border-2 ${i === fotoAktif ? "border-terpal" : "border-transparent"}`}
                    >
                      <Foto berkas={f} alt="" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-4 p-5 md:p-6">
              <div className="md:pr-12">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-tinta-lembut">{pilih.kategori}</p>
                <h2 id="rincian-judul" className="mt-1.5 text-[22px] font-bold">{judul(pilih)}</h2>
                {pilih.deskripsi && <p className="mt-1.5 text-sm text-tinta-lembut">{pilih.deskripsi}</p>}
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-5 border-y border-garis text-sm [&>div:not(:last-child)>*]:border-b [&>div>*]:border-garis [&>div>*]:py-2">
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
                      <dt className="text-tinta-lembut">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
              </dl>
              <div className="grid gap-3 rounded-xl bg-kertas p-3.5">
                <p className="text-[13px] font-semibold">Hitung perkiraan biaya sewa</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="label" htmlFor="hitung-jumlah">Jumlah ({pilih.satuan})</label>
                    <input className="isian" id="hitung-jumlah" type="number" inputMode="numeric" min={1} max={MAKS_JUMLAH} value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="label" htmlFor="hitung-hari">Lama sewa (hari)</label>
                    <input className="isian" id="hitung-hari" type="number" inputMode="numeric" min={1} value={hari} onChange={(e) => setHari(Number(e.target.value))} />
                  </div>
                </div>
                <p className="text-xs text-tinta-lembut">Belum termasuk antar, pasang, dan bongkar.</p>
              </div>
              {/* Di HP baris ini menempel di tepi bawah dialog, jadi total dan tombolnya selalu terlihat saat isi digulir. */}
              <div className="sticky bottom-0 -mx-5 -mb-5 mt-auto flex items-center justify-between gap-3 border-t border-garis bg-white px-5 py-3 md:static md:m-0 md:mt-auto md:border-t-0 md:p-0">
                <p className="leading-tight">
                  <span className="block text-xs text-tinta-lembut">Perkiraan biaya sewa</span>
                  <output htmlFor="hitung-jumlah hitung-hari" className="font-judul text-xl font-bold tabular-nums text-terpal">
                    {pilih.harga > 0 ? rupiah(j * h * pilih.harga) : "Lewat penawaran"}
                  </output>
                </p>
                {wa ? (
                  <a href={`https://wa.me/${wa}?text=${encodeURIComponent(pesanWa)}`} target="_blank" rel="noopener noreferrer" className="tombol tombol-utama min-h-11 whitespace-nowrap">
                    Tanya lewat WhatsApp
                  </a>
                ) : (
                  <Link href={tautanKontak} onClick={() => dialog.current?.close()} className="tombol tombol-utama min-h-11 whitespace-nowrap">
                    Minta penawaran
                    <IkonPanah />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
