import type { Metadata } from "next";
import Link from "next/link";
import { Bidang, Kepala, nilai, Pesan, type Cari } from "@/komponen/ui";
import { bukaPeriode, catatBayarPartner, kunciPeriode } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import { labaBulan, pengaturan } from "@/lib/data";
import { hariIni, namaBulan, rupiah } from "@/lib/format";
import { boleh, geserBulan } from "@/lib/hitung";

export const metadata: Metadata = { title: "Bagi hasil" };

export default async function BagiHasil({ searchParams }: { searchParams: Cari }) {
  const u = await wajib("keuangan.lihat");
  const tulis = boleh(u.peran, "keuangan.tulis");
  const kini = hariIni().slice(0, 7);
  const [s, periode] = await Promise.all([
    pengaturan(),
    Promise.all(Array.from({ length: 12 }, (_, i) => labaBulan(geserBulan(kini, -i)))),
  ]);
  const tutup = periode.filter((p) => p.dikunci);
  const utang = {
    tenda: tutup.reduce((n, p) => n + p.bagianTenda - p.dibayarTenda, 0),
    hka: tutup.reduce((n, p) => n + p.bagianHka - p.dibayarHka, 0),
  };
  const porsi = Number(s.porsi_tenda) || 0;
  return (
    <>
      <Kepala judul="Bagi hasil" ket="Nett profit per bulan dan bagian tiap partner. Angka dibekukan saat bulan ditutup." />
      <Pesan galat={nilai((await searchParams).galat)} />

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="kartu p-4 md:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">Rumus yang berlaku</p>
          <p className="mt-2 text-sm">
            Nett profit = pendapatan ({s.basis === "kas" ? "basis kas" : "basis akrual"}) dikurangi biaya langsung, biaya operasional, pajak {s.persen_pajak}%
            dari pendapatan, dan cadangan {s.persen_cadangan}% dari laba sesudah pajak.
          </p>
          <p className="mt-2 text-sm">Tenda Indonesia {porsi}%, HKA Management {100 - porsi}%.</p>
          {tulis && <Link href="/sistem/pengaturan" className="mt-2 inline-block text-xs underline">Ubah di Pengaturan</Link>}
        </div>
        <div className="kartu p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">Belum dibayar ke Tenda Indonesia</p>
          <p className="mt-1 font-judul text-xl font-bold tabular-nums">{rupiah(utang.tenda)}</p>
          <p className="mt-1 text-xs text-tinta-lembut">Dari periode yang sudah ditutup</p>
        </div>
        <div className="kartu p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">Belum dibayar ke HKA Management</p>
          <p className="mt-1 font-judul text-xl font-bold tabular-nums">{rupiah(utang.hka)}</p>
          <p className="mt-1 text-xs text-tinta-lembut">Dari periode yang sudah ditutup</p>
        </div>
      </section>

      <div className="kartu overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tabel">
            <thead>
              <tr>
                <th scope="col">Bulan</th>
                <th scope="col" className="angka">Pendapatan</th>
                <th scope="col" className="angka">Biaya langsung</th>
                <th scope="col" className="angka">Operasional</th>
                <th scope="col" className="angka">Pajak</th>
                <th scope="col" className="angka">Cadangan</th>
                <th scope="col" className="angka">Nett profit</th>
                <th scope="col" className="angka">Tenda Indonesia</th>
                <th scope="col" className="angka">HKA</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {periode.map((p) => (
                <tr key={p.bulan}>
                  <th scope="row" className="whitespace-nowrap">
                    <Link href={`/sistem/keuangan?bulan=${p.bulan}`} className="underline underline-offset-2">{namaBulan(p.bulan)}</Link>
                  </th>
                  <td className="angka">{rupiah(p.pendapatan)}</td>
                  <td className="angka">{rupiah(p.biayaLangsung)}</td>
                  <td className="angka">{rupiah(p.biayaOperasional)}</td>
                  <td className="angka">{rupiah(p.pajak)}</td>
                  <td className="angka">{rupiah(p.cadangan)}</td>
                  <td className="angka font-bold">{rupiah(p.labaBersih)}</td>
                  <td className="angka">
                    {rupiah(p.bagianTenda)}
                    {p.dikunci && <span className="block text-xs text-tinta-lembut">dibayar {rupiah(p.dibayarTenda)}</span>}
                  </td>
                  <td className="angka">
                    {rupiah(p.bagianHka)}
                    {p.dikunci && <span className="block text-xs text-tinta-lembut">dibayar {rupiah(p.dibayarHka)}</span>}
                  </td>
                  <td className="min-w-44">
                    {p.dikunci ? (
                      <>
                        <span className="lencana bg-[#dcefe5] text-rumput">Ditutup</span>
                        {p.catatan && <p className="mt-1 text-xs text-tinta-lembut">{p.catatan}</p>}
                        {tulis && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs underline">Catat pembayaran</summary>
                            <form action={catatBayarPartner.bind(null, p.bulan)} className="mt-2 space-y-2">
                              <Bidang label="Total dibayar ke Tenda Indonesia" id={`bt-${p.bulan}`}>
                                <input className="isian" id={`bt-${p.bulan}`} name="dibayar_tenda" inputMode="numeric" defaultValue={p.dibayarTenda} />
                              </Bidang>
                              <Bidang label="Total dibayar ke HKA" id={`bh-${p.bulan}`}>
                                <input className="isian" id={`bh-${p.bulan}`} name="dibayar_hka" inputMode="numeric" defaultValue={p.dibayarHka} />
                              </Bidang>
                              <Bidang label="Catatan" id={`bc-${p.bulan}`}>
                                <input className="isian" id={`bc-${p.bulan}`} name="catatan" maxLength={300} defaultValue={p.catatan} />
                              </Bidang>
                              <div className="flex gap-2">
                                <button className="tombol tombol-kecil tombol-tinta">Simpan</button>
                                <button formAction={bukaPeriode.bind(null, p.bulan)} className="tombol tombol-kecil">Buka periode</button>
                              </div>
                            </form>
                          </details>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="lencana bg-[#fdf0d2] text-[#8a5d0b]">Berjalan</span>
                        {tulis && (
                          <form action={kunciPeriode.bind(null, p.bulan)} className="mt-1">
                            <button className="tombol tombol-kecil">Tutup periode</button>
                          </form>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
