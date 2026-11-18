import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/komponen/panel";
import { Bidang, Kepala, nilai, Pesan, type Cari } from "@/komponen/ui";
import { bukaPeriode, catatBayarPartner, kunciPeriode } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import { labaBulan, pengaturan } from "@/lib/data";
import { hariIni, namaBulan, rupiah } from "@/lib/format";
import { boleh, geserBulan } from "@/lib/hitung";

export const metadata: Metadata = { title: "Bagi hasil" };

type Periode = Awaited<ReturnType<typeof labaBulan>>;

// Rincian angka satu bulan, dipakai di panel Tutup periode dan Catat pembayaran.
function RincianBulan({ p }: { p: Periode }) {
  const baris: [string, number, boolean?][] = [
    ["Pendapatan", p.pendapatan],
    ["Biaya langsung", p.biayaLangsung],
    ["Biaya operasional", p.biayaOperasional],
    ["Pajak", p.pajak],
    ["Cadangan", p.cadangan],
    ["Nett profit", p.labaBersih, true],
    ["Bagian Tenda Indonesia", p.bagianTenda],
    ["Bagian HKA Management", p.bagianHka],
  ];
  return (
    <dl className="ceruk mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 p-3 text-sm">
      {baris.map(([label, n, tebal]) => (
        <div key={label} className="contents">
          <dt className={tebal ? "font-bold" : "text-tinta-lembut"}>{label}</dt>
          <dd className={`text-right tabular-nums ${tebal ? "font-bold" : ""}`}>{rupiah(n)}</dd>
        </div>
      ))}
    </dl>
  );
}

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
  // Bulan tanpa pendapatan dan biaya yang belum ditutup cukup disebut di satu baris. Bulan berjalan selalu
  // tampil penuh karena itu bulan yang sedang dikerjakan.
  const sepi = (p: Periode) => !p.dikunci && p.bulan !== kini && p.pendapatan === 0 && p.biayaLangsung === 0 && p.biayaOperasional === 0;
  const tampil = periode.filter((p) => !sepi(p));
  const kosong = periode.filter(sepi);
  // Kolom pajak dan cadangan disembunyikan kalau semua bulan yang tampil bernilai nol (persentasenya 0%).
  // Rincian lengkapnya tetap ada di panel tiap bulan dan rumus di atas tabel.
  const adaPajak = tampil.some((p) => p.pajak !== 0);
  const adaCadangan = tampil.some((p) => p.cadangan !== 0);
  return (
    <>
      <Kepala judul="Bagi hasil" ket="Nett profit per bulan dan bagian tiap partner. Angka dibekukan saat bulan ditutup." />
      <Pesan galat={nilai((await searchParams).galat)} />

      <section aria-label="Belum dibayar ke partner" className="mb-3 grid grid-cols-2 gap-3">
        <div className="kartu min-w-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">Belum dibayar ke Tenda Indonesia</p>
          <p className="mt-1 font-judul text-lg font-bold tabular-nums md:text-xl">{rupiah(utang.tenda)}</p>
          <p className="mt-1 text-xs text-tinta-lembut">Dari periode yang sudah ditutup</p>
        </div>
        <div className="kartu min-w-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">Belum dibayar ke HKA Management</p>
          <p className="mt-1 font-judul text-lg font-bold tabular-nums md:text-xl">{rupiah(utang.hka)}</p>
          <p className="mt-1 text-xs text-tinta-lembut">Dari periode yang sudah ditutup</p>
        </div>
      </section>
      <p className="mb-5 text-sm text-tinta-lembut">
        Nett profit = pendapatan ({s.basis === "kas" ? "basis kas" : "basis akrual"}) dikurangi biaya langsung, biaya operasional, pajak {s.persen_pajak}%
        dari pendapatan, dan cadangan {s.persen_cadangan}% dari laba sesudah pajak. Tenda Indonesia {porsi}%, HKA Management {100 - porsi}%.
        {tulis && (
          <>
            {" "}
            <Link href="/sistem/pengaturan" className="sentuh underline underline-offset-2">Ubah di Pengaturan</Link>
          </>
        )}
      </p>

      <div className="kartu overflow-hidden">
        <table className="tabel tabel-susun text-[0.82rem] md:[&_:is(td,th)]:px-2">
          <thead>
            <tr>
              <th scope="col">Bulan</th>
              <th scope="col" className="angka">Pendapatan</th>
              <th scope="col" className="angka">Biaya langsung</th>
              <th scope="col" className="angka">Operasional</th>
              {adaPajak && <th scope="col" className="angka">Pajak</th>}
              {adaCadangan && <th scope="col" className="angka">Cadangan</th>}
              <th scope="col" className="angka">Nett profit</th>
              <th scope="col" className="angka">Tenda Indonesia</th>
              <th scope="col" className="angka">HKA</th>
              {tulis && <th scope="col"><span className="sr-only">Aksi</span></th>}
            </tr>
          </thead>
          <tbody>
            {tampil.map((p) => {
              const nama = namaBulan(p.bulan);
              return (
                <tr key={p.bulan}>
                  <th scope="row">
                    <Link href={`/sistem/keuangan?bulan=${p.bulan}`} className="sentuh whitespace-nowrap underline underline-offset-2">{nama}</Link>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {p.dikunci ? (
                        <span className="lencana bg-[#dcefe5] text-rumput">Ditutup</span>
                      ) : p.bulan === kini ? (
                        <span className="lencana bg-[#fdf0d2] text-[#8a5d0b]">Berjalan</span>
                      ) : (
                        <span className="lencana bg-[#fde0da] text-terpal-gelap">Belum ditutup</span>
                      )}
                      {p.catatan && <span className="text-xs font-normal text-tinta-lembut">{p.catatan}</span>}
                    </span>
                  </th>
                  <td className="angka" data-label="Pendapatan">{rupiah(p.pendapatan)}</td>
                  <td className="angka" data-label="Biaya langsung">{rupiah(p.biayaLangsung)}</td>
                  <td className="angka" data-label="Operasional">{rupiah(p.biayaOperasional)}</td>
                  {adaPajak && <td className="angka" data-label="Pajak">{rupiah(p.pajak)}</td>}
                  {adaCadangan && <td className="angka" data-label="Cadangan">{rupiah(p.cadangan)}</td>}
                  <td className="angka font-bold" data-label="Nett profit">{rupiah(p.labaBersih)}</td>
                  <td className="angka" data-label="Tenda Indonesia">
                    <span>
                      {rupiah(p.bagianTenda)}
                      {p.dikunci && <span className="block text-xs text-tinta-lembut">dibayar {rupiah(p.dibayarTenda)}</span>}
                    </span>
                  </td>
                  <td className="angka" data-label="HKA">
                    <span>
                      {rupiah(p.bagianHka)}
                      {p.dikunci && <span className="block text-xs text-tinta-lembut">dibayar {rupiah(p.dibayarHka)}</span>}
                    </span>
                  </td>
                  {tulis && (
                    <td className="susun-kanan w-px align-middle">
                      {p.dikunci ? (
                        <Panel
                          tombol="Catat pembayaran"
                          labelTombol={`Catat pembayaran ke partner, ${nama}`}
                          judul={`Pembayaran ke partner, ${nama}`}
                          kelasTombol="tombol tombol-kecil whitespace-nowrap"
                        >
                          <RincianBulan p={p} />
                          <form action={catatBayarPartner.bind(null, p.bulan)} className="space-y-3">
                            <Bidang label="Total dibayar ke Tenda Indonesia" id={`bt-${p.bulan}`}>
                              <input className="isian" id={`bt-${p.bulan}`} name="dibayar_tenda" inputMode="numeric" defaultValue={p.dibayarTenda} />
                            </Bidang>
                            <Bidang label="Total dibayar ke HKA" id={`bh-${p.bulan}`}>
                              <input className="isian" id={`bh-${p.bulan}`} name="dibayar_hka" inputMode="numeric" defaultValue={p.dibayarHka} />
                            </Bidang>
                            <Bidang label="Catatan" id={`bc-${p.bulan}`}>
                              <input className="isian" id={`bc-${p.bulan}`} name="catatan" maxLength={300} defaultValue={p.catatan} />
                            </Bidang>
                            <div className="flex flex-wrap justify-between gap-2 border-t border-garis pt-3">
                              <button className="tombol tombol-utama">Simpan</button>
                              <button formAction={bukaPeriode.bind(null, p.bulan)} className="tombol">Buka periode</button>
                            </div>
                          </form>
                        </Panel>
                      ) : (
                        <Panel
                          tombol="Tutup periode"
                          labelTombol={`Tutup periode ${nama}`}
                          judul={`Tutup periode ${nama}`}
                          ket="Angka di bawah dibekukan. Sesudah ditutup, transaksi di bulan ini tidak bisa ditambah atau dihapus sampai periodenya dibuka lagi."
                          kelasTombol="tombol tombol-kecil whitespace-nowrap"
                        >
                          <RincianBulan p={p} />
                          <form action={kunciPeriode.bind(null, p.bulan)}>
                            <button className="tombol tombol-utama">Tutup periode</button>
                          </form>
                        </Panel>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {kosong.length > 0 && (
          <p className="border-t border-garis px-3 py-3 text-sm text-tinta-lembut">
            Tanpa transaksi ({kosong.length} bulan, semua Rp 0):{" "}
            {kosong.map((p, i) => (
              <span key={p.bulan}>
                {i > 0 && ", "}
                <Link href={`/sistem/keuangan?bulan=${p.bulan}`} className="sentuh whitespace-nowrap underline underline-offset-2">{namaBulan(p.bulan)}</Link>
              </span>
            ))}
            .
          </p>
        )}
      </div>
    </>
  );
}
