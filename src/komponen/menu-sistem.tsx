"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { IkonMenu } from "@/komponen/ikon";

export type ButirMenu = { href: string; teks: string };

/**
 * Menu sistem. Di layar lebar menjadi sidebar tetap di kiri. Di HP yang tampil hanya kepala ringkas berisi nama
 * usaha dan tombol Menu, yang membuka laci berisi semua menu, nama dan peran pengguna, serta tombol Keluar.
 *
 * Sidebar dan laci adalah satu elemen <dialog> yang sama. Di layar lebar dialog itu ditampilkan lewat CSS walau
 * tidak terbuka (lihat `.laci` di globals.css). Di HP dibuka dengan showModal, jadi fokus terkunci di laci,
 * halaman di belakangnya tidak bisa disentuh, dan Esc menutupnya tanpa kode tambahan.
 */
export function MenuSistem({ menu, nama, peran, keluar }: { menu: ButirMenu[]; nama: string; peran: string; keluar: ReactNode }) {
  const laci = useRef<HTMLDialogElement>(null);
  const pembuka = useRef<HTMLButtonElement>(null);
  const jalur = usePathname();

  // Kalau layar dilebarkan saat laci terbuka, laci ditutup supaya kembali menjadi sidebar biasa.
  useEffect(() => {
    const lebar = matchMedia("(width >= 48rem)");
    const cek = () => {
      if (lebar.matches) laci.current?.close();
    };
    lebar.addEventListener("change", cek);
    return () => lebar.removeEventListener("change", cek);
  }, []);

  const tutup = () => laci.current?.close();
  const aktif = (href: string) => (href === "/sistem" ? jalur === href : jalur === href || jalur.startsWith(`${href}/`));

  return (
    <>
      <header className="tanpa-cetak sticky top-0 z-30 flex h-14 items-center justify-between gap-3 bg-tinta pl-4 pr-2 text-white md:hidden">
        <Link href="/sistem" className="flex min-h-11 items-center font-judul text-sm font-bold">
          Tenda Indonesia
        </Link>
        <button
          ref={pembuka}
          type="button"
          className="tombol tombol-terang min-h-11"
          aria-haspopup="dialog"
          aria-controls="laci-menu"
          onClick={() => laci.current?.showModal()}
        >
          <IkonMenu />
          Menu
        </button>
      </header>
      <dialog
        ref={laci}
        id="laci-menu"
        aria-label="Menu"
        className="laci tanpa-cetak"
        onClose={() => pembuka.current?.focus()}
        onClick={(e) => {
          if (e.target === e.currentTarget) tutup();
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 py-1.5 pl-4 pr-2 md:block md:px-4 md:pb-3 md:pt-4">
          {/* Di HP nama usaha sudah ada di kepala halaman, jadi laci cukup berjudul Menu. */}
          <p className="font-judul text-sm font-bold md:hidden">Menu</p>
          <div className="max-md:hidden">
            <Link href="/sistem" className="font-judul text-sm font-bold">
              Tenda Indonesia
            </Link>
            <p className="text-xs text-white/60">bersama HKA Management</p>
          </div>
          <button type="button" className="tombol tombol-terang min-h-11 md:hidden" onClick={tutup}>
            Tutup
          </button>
        </div>
        <nav aria-label="Menu sistem" className="space-y-1 px-2 py-2 max-md:flex-1">
          {menu.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              aria-current={aktif(m.href) ? "page" : undefined}
              onClick={tutup}
              className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium md:min-h-10 ${
                aktif(m.href) ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              {m.teks}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/15 px-4 py-3 text-xs">
          <p className="font-semibold">{nama}</p>
          <p className="text-white/60">{peran}</p>
          {keluar}
        </div>
      </dialog>
    </>
  );
}
