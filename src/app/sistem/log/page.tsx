import type { Metadata } from "next";
import Link from "next/link";
import { Kepala, Kosong, nilai, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { daftarLog } from "@/lib/data";
import { hariIni, namaBulan } from "@/lib/format";
import { geserBulan } from "@/lib/hitung";

export const metadata: Metadata = { title: "Jejak audit" };

export default async function JejakAudit({ searchParams }: { searchParams: Cari }) {
  await wajib("keuangan.lihat");
  const minta = nilai((await searchParams).bulan);
  const bulan = /^\d{4}-(0[1-9]|1[0-2])$/.test(minta) ? minta : hariIni().slice(0, 7);
  const log = daftarLog(bulan);
  return (
    <>
      <Kepala judul="Jejak audit" ket={`Siapa mengubah apa di ${namaBulan(bulan)}. Catatan ini tidak bisa diubah atau dihapus dari aplikasi.`}>
        <Link href={`/sistem/log?bulan=${geserBulan(bulan, -1)}`} className="tombol tombol-kecil">Bulan sebelumnya</Link>
        <Link href="/sistem/log" className="tombol tombol-kecil">Bulan ini</Link>
        <Link href={`/sistem/log?bulan=${geserBulan(bulan, 1)}`} className="tombol tombol-kecil">Bulan berikutnya</Link>
      </Kepala>
      <div className="kartu overflow-hidden">
        {log.length === 0 ? (
          <Kosong>Belum ada catatan di bulan ini.</Kosong>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th scope="col" className="px-4 py-2">Waktu (WIB)</th>
                  <th scope="col" className="px-4 py-2">Oleh</th>
                  <th scope="col" className="px-4 py-2">Aksi</th>
                  <th scope="col" className="px-4 py-2">Rincian</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id} className="border-t border-[#ebe3d3] align-top">
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums">{l.waktu}</td>
                    <td className="whitespace-nowrap px-4 py-2">{l.pengguna}</td>
                    <td className="whitespace-nowrap px-4 py-2 font-semibold">{l.aksi}</td>
                    <td className="px-4 py-2">{l.rincian}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
