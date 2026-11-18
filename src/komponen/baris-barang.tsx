"use client";

import { useEffect, useRef, useState } from "react";
import { PULIHKAN, type Isian } from "@/komponen/jaga-isian";
import { rupiah } from "@/lib/format";

// `nama` dipakai sebagai teks pilihan dan keterangan bawaan. Harga dan jumlah unit tampil di bawah pilihan,
// supaya teks pilihan tidak terpotong di tengah harga pada layar sempit.
export type PilihanAset = { id: number; nama: string; harga: number; punya: number };
type Baris = { kunci: number; aset: string; deskripsi: string; jumlah: string; hari: string; harga: string };
export type BarisAwal = Omit<Baris, "kunci">;

const KOSONG: BarisAwal = { aset: "", deskripsi: "", jumlah: "", hari: "1", harga: "" };

// Angka dari isian, misalnya "1.500.000" atau "1500000". Yang tidak terbaca dianggap nol.
function angka(t: string): number {
  const n = Number(t.replace(/[.\s]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Baris barang di formulir penawaran. Tiap baris berupa kartu kecil: pilihan aset dan keterangan, lalu Jumlah,
 * Hari, Harga, dan nilai baris. Tombol "Tambah baris" dan "Hapus" bekerja di browser. Tanpa JavaScript
 * baris awal tetap terkirim apa adanya, dan selalu ada minimal satu baris.
 *
 * Nama isian (b_aset, b_deskripsi, b_jumlah, b_hari, b_harga) dibaca server berdasarkan urutan, jadi baris yang
 * dihapus di sini cukup dibuang dari formulir. Kalau kiriman gagal, semua baris dikembalikan lewat event
 * PULIHKAN dari jaga-isian.tsx.
 */
export function BarisBarang({ aset, awal }: { aset: PilihanAset[]; awal: BarisAwal[] }) {
  // `berikut` adalah kunci React untuk baris yang ditambahkan berikutnya.
  const [{ baris }, setIsi] = useState(() => {
    const mula = awal.length ? awal : [KOSONG];
    return { baris: mula.map((b, i): Baris => ({ ...b, kunci: i })), berikut: mula.length };
  });
  const daftar = useRef<HTMLOListElement>(null);
  const cariAset = (id: string) => aset.find((a) => String(a.id) === id);

  // Baris yang tadi diketik dibangun ulang sesudah kiriman yang gagal.
  useEffect(() => {
    const form = daftar.current?.closest("form");
    if (!form) return;
    function pulihkan(e: Event) {
      const isian = (e as CustomEvent<Isian>).detail;
      const kolom = (nama: string) => isian.filter(([n]) => n === nama).map(([, v]) => String(v));
      const [bAset, bDesk, bJumlah, bHari, bHarga] = ["b_aset", "b_deskripsi", "b_jumlah", "b_hari", "b_harga"].map(kolom);
      if (bAset.length === 0) return;
      const baris = bAset.map((a, i): Baris => ({ kunci: i, aset: a, deskripsi: bDesk[i] ?? "", jumlah: bJumlah[i] ?? "", hari: bHari[i] ?? "1", harga: bHarga[i] ?? "" }));
      setIsi({ baris, berikut: baris.length });
    }
    form.addEventListener(PULIHKAN, pulihkan);
    return () => form.removeEventListener(PULIHKAN, pulihkan);
  }, []);

  function ubah(kunci: number, isi: Partial<BarisAwal>) {
    setIsi((s) => ({ ...s, baris: s.baris.map((b) => (b.kunci === kunci ? { ...b, ...isi } : b)) }));
  }

  function tambah() {
    setIsi((s) => ({ baris: [...s.baris, { ...KOSONG, kunci: s.berikut }], berikut: s.berikut + 1 }));
    // Fokus ke pilihan aset di baris baru sesudah baris itu tampil.
    requestAnimationFrame(() => daftar.current?.querySelector<HTMLSelectElement>("li:last-child select")?.focus());
  }

  // Baris terakhir tidak dibuang, cukup dikosongkan, supaya formulir selalu punya satu baris.
  function hapus(kunci: number) {
    setIsi((s) =>
      s.baris.length > 1
        ? { ...s, baris: s.baris.filter((b) => b.kunci !== kunci) }
        : { baris: [{ ...KOSONG, kunci: s.berikut }], berikut: s.berikut + 1 },
    );
  }

  const nilai = (b: Baris) => angka(b.jumlah) * Math.max(1, angka(b.hari)) * (b.harga.trim() ? angka(b.harga) : (cariAset(b.aset)?.harga ?? 0));
  const subtotal = baris.reduce((s, b) => s + nilai(b), 0);

  return (
    <fieldset className="@container min-w-0" data-jaga-sendiri>
      <legend className="label">Barang dan jasa</legend>
      <ol ref={daftar} className="space-y-2">
        {baris.map((b, i) => {
          const a = cariAset(b.aset);
          const ke = i + 1;
          return (
            <li key={b.kunci} className="rounded-lg border border-garis bg-white p-2.5">
              <div className="flex items-start gap-1">
                <div className="grid min-w-0 flex-1 items-start gap-2 @2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <div className="min-w-0">
                  <select
                    className="isian"
                    name="b_aset"
                    aria-label={`Aset baris ${ke}`}
                    value={b.aset}
                    onChange={(e) => {
                      // Keterangan yang masih sama dengan nama aset lama ikut dikosongkan, supaya terisi nama aset baru.
                      const lama = cariAset(b.aset)?.nama;
                      ubah(b.kunci, { aset: e.target.value, ...(lama && b.deskripsi === lama ? { deskripsi: "" } : {}) });
                    }}
                  >
                    <option value="">Jasa atau biaya lain</option>
                    {aset.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nama}
                      </option>
                    ))}
                  </select>
                  {a && (
                    <p className="mt-1 text-xs text-tinta-lembut">
                      {rupiah(a.harga)} per unit per hari, punya {a.punya} unit
                    </p>
                  )}
                  </div>
                  <input
                    className="isian"
                    name="b_deskripsi"
                    aria-label={`Keterangan baris ${ke}`}
                    placeholder={a ? a.nama : "Keterangan di dokumen"}
                    maxLength={200}
                    value={b.deskripsi}
                    onChange={(e) => ubah(b.kunci, { deskripsi: e.target.value })}
                  />
                </div>
                <button type="button" className="tombol-teks shrink-0 px-2" aria-label={`Hapus baris ${ke}`} onClick={() => hapus(b.kunci)}>
                  Hapus
                </button>
              </div>
              <div className="mt-2 grid grid-cols-[minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,1.3fr)] gap-2 @2xl:grid-cols-[6rem_5rem_10rem_minmax(0,1fr)] @2xl:items-end">
                <label className="block min-w-0">
                  <span className="mb-0.5 block text-xs text-tinta-lembut">Jumlah</span>
                  <input
                    className="isian"
                    name="b_jumlah"
                    aria-label={`Jumlah baris ${ke}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={b.jumlah}
                    onChange={(e) => ubah(b.kunci, { jumlah: e.target.value })}
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-0.5 block text-xs text-tinta-lembut">Hari</span>
                  <input
                    className="isian"
                    name="b_hari"
                    aria-label={`Hari baris ${ke}`}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={b.hari}
                    onChange={(e) => ubah(b.kunci, { hari: e.target.value })}
                  />
                </label>
                <label className="block min-w-0">
                  <span className="mb-0.5 block text-xs text-tinta-lembut">Harga satuan</span>
                  <input
                    className="isian"
                    name="b_harga"
                    aria-label={`Harga baris ${ke}`}
                    inputMode="numeric"
                    placeholder={a ? a.harga.toLocaleString("id-ID") : ""}
                    value={b.harga}
                    onChange={(e) => ubah(b.kunci, { harga: e.target.value })}
                  />
                </label>
                <p className="col-span-3 flex items-baseline justify-between gap-3 text-sm @2xl:col-span-1 @2xl:block @2xl:pb-2.5 @2xl:text-right">
                  <span className="text-xs text-tinta-lembut @2xl:sr-only">Nilai baris</span>
                  <span className="font-semibold tabular-nums">{rupiah(nilai(b))}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <button type="button" className="tombol tombol-garis" onClick={tambah}>
          Tambah baris
        </button>
        <p className="text-sm">
          Subtotal <span className="font-judul text-base font-bold tabular-nums">{rupiah(subtotal)}</span>
        </p>
      </div>
    </fieldset>
  );
}
