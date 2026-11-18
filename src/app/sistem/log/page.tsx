import type { Metadata } from "next";
import Link from "next/link";
import { Kepala, Kosong, nilai, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { daftarLog } from "@/lib/data";
import { hariIni, namaBulan, waktu } from "@/lib/format";
import { bulanSah, geserBulanSah } from "@/lib/hitung";

export const metadata: Metadata = { title: "Jejak audit" };

export default async function JejakAudit({ searchParams }: { searchParams: Cari }) {
  await wajib("keuangan.lihat");
  const minta = nilai((await searchParams).bulan);
  const bulan = bulanSah(minta) ? minta : hariIni().slice(0, 7);
  const sebelumnya = geserBulanSah(bulan, -1);
  const berikutnya = geserBulanSah(bulan, 1);
  const log = await daftarLog(bulan);
  return (
    <>
      <Kepala judul="Jejak audit" ket={`Siapa mengubah apa di ${namaBulan(bulan)}. Catatan ini tidak bisa diubah atau dihapus dari aplikasi.`}>
        {sebelumnya && <Link href={`/sistem/log?bulan=${sebelumnya}`} className="tombol tombol-kecil">Bulan sebelumnya</Link>}
        <Link href="/sistem/log" className="tombol tombol-kecil">Bulan ini</Link>
        {berikutnya && <Link href={`/sistem/log?bulan=${berikutnya}`} className="tombol tombol-kecil">Bulan berikutnya</Link>}
      </Kepala>
      <div className="kartu">
        {log.length === 0 ? (
          <Kosong>Belum ada catatan di bulan ini.</Kosong>
        ) : (
          <table className="tabel tabel-susun">
            <thead>
              <tr>
                <th scope="col">Waktu (WIB)</th>
                <th scope="col">Oleh</th>
                <th scope="col">Aksi</th>
                <th scope="col">Rincian</th>
              </tr>
            </thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id}>
                  <td className="susun-kanan whitespace-nowrap text-xs tabular-nums text-tinta-lembut md:text-sm md:text-tinta">{waktu(l.waktu)}</td>
                  <td className="susun-kanan whitespace-nowrap text-xs text-tinta-lembut md:text-sm md:text-tinta">{l.pengguna}</td>
                  <td className="font-semibold md:whitespace-nowrap">{l.aksi}</td>
                  <td className="susun-penuh break-words">{l.rincian}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
