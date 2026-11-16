"use client";

import Image from "next/image";
import { useRef, useState, type CSSProperties } from "react";
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

// Ilustrasi pengganti selama barang belum punya foto.
function Ikon({ kategori, className = "size-24" }: { kategori: string; className?: string }) {
  const k = kategori.toLowerCase();
  const garis = { fill: "none", stroke: "#1d2a44", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let isi = <path d="M12 52V26l20-14 20 14v26z M24 52V38h16v14" {...garis} fill="#fbf8f1" />;
  if (k.includes("tenda")) {
    isi = (
      <>
        <path d="M6 34 32 10l26 24z" fill="#d8412f" stroke="#1d2a44" strokeWidth="3" strokeLinejoin="round" />
        <path d="M6 34h52v6q-6.5 6-13 0t-13 0-13 0-13 0z" fill="#fbf8f1" stroke="#1d2a44" strokeWidth="3" strokeLinejoin="round" />
        <path d="M12 42v14M52 42v14M32 10V4" {...garis} />
      </>
    );
  } else if (k.includes("lantai") || k.includes("panggung")) {
    isi = <path d="M6 30 32 18l26 12-26 12z M6 30v10l26 12 26-12V30 M32 42v10" {...garis} fill="#f2b544" />;
  } else if (k.includes("kursi") || k.includes("meja") || k.includes("furnitur")) {
    isi = <path d="M20 8v26h24v-10H28V8z M20 34v20M44 34v20M28 34v12" {...garis} fill="#fbf8f1" />;
  } else if (k.includes("dingin") || k.includes("kipas") || k.includes("ac")) {
    isi = (
      <>
        <circle cx="32" cy="26" r="18" {...garis} fill="#fbf8f1" />
        <path d="M32 26c0-10 8-12 8-6s-8 6-8 6zm0 0c-9 5-14-1-9-4s9 4 9 4zm0 0c9 5 4 12-1 9s1-9 1-9z M32 44v12M22 56h20" {...garis} fill="#f2b544" />
      </>
    );
  } else if (k.includes("lampu") || k.includes("listrik")) {
    isi = <path d="M32 6a16 16 0 0 0-9 29v7h18v-7a16 16 0 0 0-9-29z M25 48h14M27 54h10" {...garis} fill="#f2b544" />;
  }
  return <svg viewBox="0 0 64 64" aria-hidden className={className}>{isi}</svg>;
}

// Foto bawaan (public/katalog) lewat komponen image Next. Foto unggahan dari /foto tetap <img>.
// Induknya harus relative dengan rasio tetap, supaya ruangnya sudah dipesan sebelum foto termuat.
function Foto({ berkas, alt, sizes }: { berkas: string; alt: string; sizes: string }) {
  const src = urlFoto(berkas);
  if (src.startsWith("/katalog/")) return <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className="absolute inset-0 size-full object-cover" />;
}

// Label harga berbentuk tag kanvas dengan mata ayam, seperti penanda di tali tenda.
function LabelHarga({ harga, satuan }: { harga: number; satuan: string }) {
  return (
    <p className="relative inline-flex -rotate-2 flex-wrap items-baseline gap-x-2 whitespace-nowrap rounded-md border border-b-4 border-lampu-gelap bg-lampu py-1 pl-7 pr-3 text-sm font-bold shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_2px_3px_rgb(29_42_68/0.18)]">
      <span aria-hidden className="absolute left-2 top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-tinta bg-kanvas shadow-[inset_0_1px_2px_rgb(29_42_68/0.5)]" />
      {harga > 0 ? (
        <>
          {rupiah(harga)} <span className="text-xs font-medium">per {satuan} per hari</span>
        </>
      ) : (
        "Harga lewat penawaran"
      )}
    </p>
  );
}

const judul = (b: Barang) => [b.nama, b.ukuran].filter(Boolean).join(" ");
const batasi = (n: number, maks: number) => Math.min(Math.max(1, Math.floor(n) || 1), Math.max(1, maks));
const MAKS_JUMLAH = 999;

export function Katalog({ barang, wa, namaUsaha }: { barang: Barang[]; wa: string | null; namaUsaha: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [saring, setSaring] = useState("Semua");
  const [pilih, setPilih] = useState<Barang | null>(null);
  const [fotoAktif, setFotoAktif] = useState(0);
  const [jumlah, setJumlah] = useState(1);
  const [hari, setHari] = useState(1);

  // Saat "Semua", tenda tampil lebih dulu lalu kategori lain menurut abjad. Urutan di dalam kategori tetap dari server.
  const kategori = urutKategori(barang.map((b) => b.kategori));
  const aktif = kategori.includes(saring) ? saring : "Semua";
  const tampil = barang
    .filter((b) => aktif === "Semua" || b.kategori === aktif)
    .sort((a, b) => kategori.indexOf(a.kategori) - kategori.indexOf(b.kategori));

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
    return <p className="kartu mt-8 p-6 text-sm text-tinta-lembut">Katalog sedang disiapkan. Tanyakan kebutuhan Anda lewat formulir di bawah.</p>;
  }
  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Saring kategori">
        {["Semua", ...kategori].map((k) => (
          <button key={k} type="button" aria-pressed={aktif === k} onClick={() => setSaring(k)} className="chip">
            {k} <span className="font-medium tabular-nums opacity-70">{k === "Semua" ? barang.length : barang.filter((b) => b.kategori === k).length}</span>
          </button>
        ))}
      </div>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tampil.map((b, i) => (
          <li
            key={b.id}
            style={{ "--tunda": `${Math.min(i, 8) * 60}ms` } as CSSProperties}
            className="kartu angkat muncul relative flex flex-col overflow-hidden has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lampu-gelap"
          >
            <div className="slot-foto m-2 mb-0 grid aspect-[4/3] place-items-center rounded-lg">
              {b.foto.length > 0 ? (
                <Foto berkas={b.foto[0]} alt={`Foto ${judul(b)}`} sizes="(min-width: 1152px) 360px, (min-width: 640px) 45vw, 90vw" />
              ) : (
                <Ikon kategori={b.kategori} />
              )}
            </div>
            <div className="flex flex-1 flex-col items-start gap-2 p-4">
              <h3 className="font-judul text-base font-bold">
                {b.nama} {b.ukuran && <span className="font-isi text-sm font-semibold text-tinta-lembut">{b.ukuran}</span>}
              </h3>
              {(b.kapasitas || b.foto.length > 1) && (
                <ul className="flex flex-wrap gap-1.5 text-xs font-semibold" aria-label="Keterangan singkat">
                  {b.kapasitas && <li className="rounded-md border border-garis border-b-2 bg-[#ebe3d3] px-2 py-0.5">{b.kapasitas}</li>}
                  {b.foto.length > 1 && <li className="rounded-md border border-garis border-b-2 bg-[#ebe3d3] px-2 py-0.5">{b.foto.length} foto</li>}
                </ul>
              )}
              {b.deskripsi && <p className="flex-1 text-sm text-tinta-lembut">{b.deskripsi}</p>}
              <LabelHarga harga={b.harga} satuan={b.satuan} />
              {/* Satu-satunya perhentian tab di kartu. Lapisan after memperluas area klik ke seluruh kartu. */}
              <button
                type="button"
                onClick={() => buka(b)}
                aria-label={`Lihat rincian ${judul(b)}`}
                className="tombol tombol-kecil tombol-tinta mt-1 outline-none after:absolute after:inset-0 after:content-['']"
              >
                Lihat rincian
              </button>
            </div>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-labelledby="rincian-judul"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        onClose={() => setPilih(null)}
        className="m-auto w-full max-w-[860px] rounded-[10px] bg-kertas p-0 text-tinta shadow-2xl backdrop:bg-tinta/55 max-sm:max-w-[calc(100vw-24px)]"
      >
        {pilih && (
          <div className="relative grid md:grid-cols-[1.1fr_1fr]">
            <button type="button" onClick={() => dialog.current?.close()} className="tombol tombol-kecil absolute right-2 top-2 z-10">
              Tutup
            </button>
            <div className="grid content-start gap-2 bg-[#ebe3d3] p-3">
              <div className="slot-foto grid aspect-[4/3] place-items-center rounded-lg">
                {pilih.foto.length > 0 ? (
                  <Foto
                    key={pilih.foto[fotoAktif] ?? pilih.foto[0]}
                    berkas={pilih.foto[fotoAktif] ?? pilih.foto[0]}
                    alt={`Foto ${judul(pilih)} nomor ${fotoAktif + 1}`}
                    sizes="(min-width: 860px) 460px, 90vw"
                  />
                ) : (
                  <Ikon kategori={pilih.kategori} className="size-40" />
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
                      className={`slot-foto h-12 w-16 rounded-md border-2 ${i === fotoAktif ? "border-terpal" : "border-transparent"}`}
                    >
                      <Foto berkas={f} alt="" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid min-w-0 content-start gap-3 p-5">
              <h3 id="rincian-judul" className="pr-16 font-judul text-lg font-bold">{judul(pilih)}</h3>
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
                  <output htmlFor="hitung-jumlah hitung-hari" className="font-judul text-lg font-bold tabular-nums">
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
                  <a href="#kontak" onClick={() => dialog.current?.close()} className="tombol tombol-utama">
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
