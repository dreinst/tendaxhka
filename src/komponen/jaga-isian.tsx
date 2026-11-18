"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Menjaga isian formulir saat aksi server gagal.
 *
 * Aksi server yang gagal mengalihkan ke `jalur?galat=...` (lihat gagal() di src/lib/aksi.ts). Pengalihan dari
 * aksi server selalu memasang ulang halaman, jadi isian yang sudah diketik dan panel yang sedang terbuka ikut
 * hilang. Untuk mencegahnya, isian direkam ke sessionStorage tepat saat formulir dikirim. Begitu halaman
 * terpasang ulang di jalur yang sama dan alamatnya membawa `galat`, isian dikembalikan. Kalau tidak ada `galat`,
 * kiriman dianggap berhasil dan rekamannya dibuang.
 *
 * Kata sandi, berkas, dan isian tersembunyi tidak pernah direkam. Rekaman hanya berlaku sebentar dan langsung
 * dihapus begitu dibaca.
 */

const SIMPAN = "tenda:kiriman";
const UMUR_MS = 30_000;
const JENIS_DILEWATI = ["password", "file", "hidden", "submit", "button", "reset", "image"];
export const PULIHKAN = "pulihkan-isian";

export type Isian = [string, string | boolean][];
type Rekaman = { jalur: string; kunci: string; form: number; tanda: string; isian: Isian; waktu: number };
type Elemen = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function direkam(el: Element): el is Elemen {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return false;
  if (!el.name || el.name.startsWith("$ACTION")) return false;
  return !(el instanceof HTMLInputElement && JENIS_DILEWATI.includes(el.type));
}

const centang = (el: Elemen): el is HTMLInputElement => el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");

// Isian tersembunyi milik formulir (misalnya id tugas), supaya isian tidak dikembalikan ke formulir lain yang
// kebetulan berjudul sama.
function tandaForm(form: HTMLFormElement): string {
  return JSON.stringify(
    [...form.elements]
      .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === "hidden" && !!el.name && !el.name.startsWith("$ACTION"))
      .map((el) => [el.name, el.value]),
  );
}

export function rekamKiriman(kunci: string, form: HTMLFormElement, indeks = 0): void {
  const isian: Isian = [...form.elements].filter(direkam).map((el) => [el.name, centang(el) ? el.checked : el.value]);
  const rekaman: Rekaman = { jalur: location.pathname, kunci, form: indeks, tanda: tandaForm(form), isian, waktu: Date.now() };
  try {
    sessionStorage.setItem(SIMPAN, JSON.stringify(rekaman));
  } catch {
    // Penyimpanan penuh atau dimatikan: formulir tetap terkirim, hanya isiannya yang tidak bisa dikembalikan.
  }
}

/**
 * Kiriman gagal milik `kunci` di halaman ini. `cariForm` memberi formulir ke-n milik pemanggil. Hasilnya null
 * kalau rekaman bukan milik pemanggil, sudah kedaluwarsa, atau kirimannya berhasil.
 */
export function ambilKirimanGagal(kunci: string, cariForm: (indeks: number) => HTMLFormElement | null | undefined) {
  let r: Rekaman;
  try {
    const teks = sessionStorage.getItem(SIMPAN);
    if (!teks) return null;
    r = JSON.parse(teks) as Rekaman;
  } catch {
    return null;
  }
  const buang = () => sessionStorage.removeItem(SIMPAN);
  // Pengalihan ke halaman lain berarti rekaman ini tidak akan dipakai lagi.
  if (r.jalur !== location.pathname || Date.now() - r.waktu > UMUR_MS) {
    buang();
    return null;
  }
  if (r.kunci !== kunci) return null;
  const form = cariForm(r.form);
  if (!form || tandaForm(form) !== r.tanda) return null;
  buang();
  const cari = new URLSearchParams(location.search);
  const galat = cari.get("galat");
  // `tersimpan` berarti datanya sudah masuk dan pesannya hanya peringatan, jadi formulir tidak dibuka lagi
  // supaya tidak terkirim dua kali.
  if (!galat || cari.has("tersimpan")) return null;
  return { form, isian: r.isian, galat };
}

/**
 * Mengembalikan isian ke formulir menurut nama dan urutannya. Isian di dalam `[data-jaga-sendiri]` dilewati,
 * karena komponennya memulihkan diri sendiri lewat event PULIHKAN (misalnya BarisBarang).
 */
export function pulihkanIsian(form: HTMLFormElement, isian: Isian): void {
  const menurutNama = new Map<string, (string | boolean)[]>();
  for (const [nama, nilai] of isian) menurutNama.set(nama, [...(menurutNama.get(nama) ?? []), nilai]);
  const urutan = new Map<string, number>();
  for (const el of [...form.elements].filter(direkam)) {
    const ke = urutan.get(el.name) ?? 0;
    urutan.set(el.name, ke + 1);
    if (el.closest("[data-jaga-sendiri]")) continue;
    const nilai = menurutNama.get(el.name)?.[ke];
    if (nilai === undefined) continue;
    if (centang(el)) el.checked = nilai === true;
    else el.value = String(nilai);
  }
  form.dispatchEvent(new CustomEvent<Isian>(PULIHKAN, { detail: isian }));
}

/**
 * Untuk formulir yang tidak berada di dalam Panel (Panel sudah menjaga isinya sendiri). Taruh di dalam <form>,
 * sebaiknya di samping tombol kirim, karena di situ tulisan "Sedang menyimpan" muncul. `kunci` harus unik di
 * halamannya. Selama mengirim, formulir dibuat inert supaya tidak terkirim dua kali.
 */
export function JagaIsian({ kunci }: { kunci: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form || form.closest("dialog.panel")) return;
    const gagal = ambilKirimanGagal(kunci, (i) => (i === 0 ? form : null));
    if (gagal) pulihkanIsian(form, gagal.isian);

    let jeda: ReturnType<typeof setTimeout> | undefined;
    let mengirim = false;
    function kirim(e: SubmitEvent) {
      if (!form) return;
      // Kiriman kedua sebelum halaman berganti dibatalkan. React tidak menjalankan aksi form yang submit-nya
      // dibatalkan.
      if (mengirim) {
        e.preventDefault();
        return;
      }
      mengirim = true;
      rekamKiriman(kunci, form);
      form.inert = true;
      setSibuk(true);
      // Kalau jaringan putus dan halaman tidak pernah berganti, formulir dibuka lagi.
      jeda = setTimeout(() => {
        mengirim = false;
        form.inert = false;
        setSibuk(false);
      }, 20_000);
    }
    form.addEventListener("submit", kirim);
    return () => {
      form.removeEventListener("submit", kirim);
      clearTimeout(jeda);
    };
  }, [kunci]);

  return (
    <span ref={ref} role="status" className={sibuk ? "text-sm text-tinta-lembut" : "sr-only"}>
      {sibuk ? "Sedang menyimpan…" : ""}
    </span>
  );
}
