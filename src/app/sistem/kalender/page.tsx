import type { Metadata } from "next";
import Link from "next/link";
import { Kepala, Kosong, nilai, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { daftarPakai, type Aset } from "@/lib/data";
import { semua } from "@/lib/db";
import { hariIni, namaBulan } from "@/lib/format";
import { batasBulan, bulanSah, geserBulanSah, pakaiPerHari, rentangHari } from "@/lib/hitung";

export const metadata: Metadata = { title: "Kalender aset" };

export default async function Kalender({ searchParams }: { searchParams: Cari }) {
  await wajib("aset.lihat");
  const hari = hariIni();
  const minta = nilai((await searchParams).bulan);
  const bulan = bulanSah(minta) ? minta : hari.slice(0, 7);
  const sebelumnya = geserBulanSah(bulan, -1);
  const berikutnya = geserBulanSah(bulan, 1);
  const { awal, akhir } = batasBulan(bulan);
  const tanggal = rentangHari(awal, akhir);
  const [aset, pakai] = await Promise.all([
    semua<Aset>("SELECT * FROM aset WHERE aktif = 1 ORDER BY kategori, nama, ukuran"),
    daftarPakai(awal, akhir),
  ]);
  return (
    <>
      <Kepala judul="Kalender aset" ket={`Sisa unit yang bisa disewakan per hari, ${namaBulan(bulan)}. Penawaran belum mengurangi angka ini.`}>
        {sebelumnya && <Link href={`/sistem/kalender?bulan=${sebelumnya}`} className="tombol tombol-kecil">Bulan sebelumnya</Link>}
        <Link href="/sistem/kalender" className="tombol tombol-kecil">Bulan ini</Link>
        {berikutnya && <Link href={`/sistem/kalender?bulan=${berikutnya}`} className="tombol tombol-kecil">Bulan berikutnya</Link>}
      </Kepala>
      <div className="kartu overflow-hidden">
        {aset.length === 0 ? (
          <Kosong>Belum ada aset aktif.</Kosong>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 min-w-44 bg-kertas px-3 py-2 text-left">Aset</th>
                  {tanggal.map((t) => (
                    <th key={t} scope="col" className={`min-w-8 px-1 py-2 text-center font-semibold ${t === hari ? "bg-lampu" : ""}`}>
                      {Number(t.slice(8))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aset.map((a) => {
                  const terpakai = pakaiPerHari(pakai, a.id, tanggal);
                  return (
                    <tr key={a.id} className="border-t border-[#ebe3d3]">
                      <th scope="row" className="sticky left-0 z-10 bg-kertas px-3 py-1.5 text-left font-semibold">
                        {a.nama} {a.ukuran} <span className="font-normal text-tinta-lembut">({a.jumlah})</span>
                      </th>
                      {terpakai.map((n, i) => {
                        const sisa = a.jumlah - n;
                        const warna = n === 0 ? "" : sisa <= 0 ? "bg-terpal text-white" : "bg-[#fbe3b0]";
                        return (
                          <td key={tanggal[i]} className={`px-1 py-1.5 text-center tabular-nums ${warna}`} title={`${tanggal[i]}: terpakai ${n}, sisa ${sisa}`}>
                            {sisa}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-tinta-lembut">
        <span><span className="mr-1 inline-block size-3 rounded-sm bg-[#fbe3b0] align-middle" />Sebagian terpakai</span>
        <span><span className="mr-1 inline-block size-3 rounded-sm bg-terpal align-middle" />Habis</span>
        <span>Angka di sel adalah sisa unit. Unit yang diperbaiki ikut mengurangi.</span>
      </p>
    </>
  );
}
