"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { ambilKirimanGagal, pulihkanIsian, rekamKiriman } from "@/komponen/jaga-isian";

const LEBAR = { sedang: "30rem", lebar: "50rem" } as const;

/**
 * Tombol pembuka plus panel samping berbasis <dialog>, untuk tambah dan ubah data tanpa formulir bertumpuk.
 *
 * Pakai dari komponen server:
 *   <Panel tombol="Catat biaya" judul="Catat biaya langsung">
 *     <form action={tambahBiaya}>...</form>
 *   </Panel>
 *
 * Isi panel (children) tetap dirender di server dan selalu ada di HTML walau panel tertutup, jadi form di
 * dalamnya bisa dikirim tanpa JavaScript dan bisa ditemukan uji HTTP. Panel tertutup lewat Esc, tombol Tutup,
 * dan klik di luar panel.
 *
 * Saat form di dalamnya dikirim, panel tetap terbuka dan isinya dikunci sampai halaman berganti. Kalau aksinya
 * gagal, halaman dipasang ulang dengan `galat` di alamatnya, lalu panel ini membuka diri lagi lengkap dengan
 * isian yang tadi diketik dan pesan galatnya (lihat jaga-isian.tsx). Kalau berhasil, panel tertutup dan
 * formulirnya kosong lagi karena halamannya baru.
 *
 * `kunci` membedakan panel yang judulnya bisa sama di satu halaman. Bawaannya judul.
 * Pakai `labelTombol` kalau teks tombol terlalu pendek untuk dibaca pembaca layar, misalnya "Ubah" di tabel.
 * Jangan letakkan Panel di dalam <form> lain.
 */
export function Panel({
  tombol,
  judul,
  ket,
  labelTombol,
  kelasTombol = "tombol",
  lebar = "sedang",
  kunci,
  children,
}: {
  tombol: ReactNode;
  judul: string;
  ket?: string;
  labelTombol?: string;
  kelasTombol?: string;
  lebar?: keyof typeof LEBAR;
  kunci?: string;
  children: ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const pembuka = useRef<HTMLButtonElement>(null);
  const pesan = useRef<HTMLParagraphElement>(null);
  // Klik di luar dihitung hanya kalau tekanannya juga dimulai di luar, supaya menyeret teks dari dalam isian
  // ke luar panel tidak ikut menutupnya.
  const tekanDiLuar = useRef(false);
  const isi = useRef<HTMLDivElement>(null);
  const mengirim = useRef(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState("");
  const kunciPanel = kunci ?? judul;

  // Kiriman yang gagal: buka lagi panelnya dengan isian yang tadi dan pesan galatnya.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const gagal = ambilKirimanGagal(kunciPanel, (i) => d.querySelectorAll("form")[i]);
    if (!gagal) return;
    d.showModal();
    pulihkanIsian(gagal.form, gagal.isian);
    setGalat(gagal.galat);
  }, [kunciPanel]);

  useEffect(() => {
    if (galat) pesan.current?.focus();
  }, [galat]);

  // Kalau jaringan putus dan halaman tidak pernah berganti, panel dibuka kuncinya lagi.
  useEffect(() => {
    if (!sibuk) return;
    const jeda = setTimeout(() => {
      mengirim.current = false;
      setSibuk(false);
    }, 20_000);
    return () => clearTimeout(jeda);
  }, [sibuk]);

  function buka() {
    const d = dialog.current;
    if (!d || d.open) return;
    d.showModal();
    // Fokus ke judul dulu: pembaca layar menyebut nama panel, dan papan ketik HP tidak langsung muncul.
    d.querySelector<HTMLElement>("[data-judul-panel]")?.focus();
  }

  function tutup() {
    dialog.current?.close();
  }

  function kirim(e: FormEvent<HTMLDialogElement>) {
    const form = e.target;
    const d = dialog.current;
    if (!(form instanceof HTMLFormElement) || !d) return;
    // Kiriman kedua sebelum halaman berganti dibatalkan. React tidak menjalankan aksi form yang submit-nya
    // dibatalkan.
    if (mengirim.current) {
      e.preventDefault();
      return;
    }
    mengirim.current = true;
    rekamKiriman(kunciPanel, form, [...d.querySelectorAll("form")].indexOf(form));
    // Dikunci langsung di DOM, tanpa menunggu React merender ulang. Isian yang inert tetap ikut terkirim.
    if (isi.current) isi.current.inert = true;
    setSibuk(true);
  }

  return (
    <>
      <button
        ref={pembuka}
        type="button"
        className={kelasTombol}
        aria-haspopup="dialog"
        aria-controls={id}
        aria-label={labelTombol}
        onClick={buka}
      >
        {tombol}
      </button>
      <dialog
        ref={dialog}
        id={id}
        className="panel tanpa-cetak"
        aria-labelledby={`${id}-judul`}
        aria-describedby={ket ? `${id}-ket` : undefined}
        style={{ "--lebar-panel": LEBAR[lebar] } as CSSProperties}
        onClose={() => {
          setGalat("");
          pembuka.current?.focus();
        }}
        onPointerDown={(e) => {
          tekanDiLuar.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (tekanDiLuar.current && e.target === e.currentTarget) tutup();
        }}
        onSubmit={kirim}
      >
        <div className="panel-kepala">
          <div className="min-w-0">
            <h2 id={`${id}-judul`} tabIndex={-1} data-judul-panel className="text-base font-bold focus:outline-none">
              {judul}
            </h2>
            {ket && (
              <p id={`${id}-ket`} className="mt-1 text-xs text-tinta-lembut">
                {ket}
              </p>
            )}
          </div>
          <button type="button" className="tombol tombol-kecil shrink-0" onClick={tutup}>
            Tutup
          </button>
        </div>
        {/* Selama mengirim, isi panel inert supaya formulir tidak terkirim dua kali. */}
        <div ref={isi} className="panel-isi" inert={sibuk} aria-busy={sibuk}>
          {galat && (
            <p ref={pesan} role="alert" tabIndex={-1} className="mb-4 rounded-md border border-terpal-gelap/40 bg-[#fde9e5] px-4 py-3 text-sm font-medium text-terpal-gelap focus:outline-none">
              {galat}
            </p>
          )}
          {children}
        </div>
        <p role="status" className={sibuk ? "panel-sibuk" : "sr-only"}>
          {sibuk ? "Sedang menyimpan…" : ""}
        </p>
      </dialog>
    </>
  );
}
