import type { Metadata } from "next";
import Link from "next/link";
import { FormAset } from "@/komponen/form-aset";
import { Kepala, Kosong, nilai, Pesan, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { daftarPakai, type Aset } from "@/lib/data";
import { semua } from "@/lib/db";
import { hariIni, rupiah } from "@/lib/format";
import { boleh, pakaiPerHari } from "@/lib/hitung";

export const metadata: Metadata = { title: "Aset" };

export default async function HalamanAset({ searchParams }: { searchParams: Cari }) {
  const u = await wajib("aset.lihat");
  const tulis = boleh(u.peran, "aset.tulis");
  const hari = hariIni();
  const aset = semua<Aset>("SELECT * FROM aset ORDER BY aktif DESC, kategori, nama, ukuran");
  const sewa = daftarPakai(hari, hari, { perawatan: false });
  const semuaPakai = daftarPakai(hari, hari);
  return (
    <>
      <Kepala judul="Aset" ket="Jumlah yang dimiliki, yang sedang tersewa, dan yang sedang diperbaiki hari ini." />
      <Pesan galat={nilai((await searchParams).galat)} />
      {tulis && (
        <details className="kartu mb-5 p-4">
          <summary className="cursor-pointer text-sm font-bold">Tambah aset</summary>
          <div className="mt-4"><FormAset /></div>
        </details>
      )}
      <div className="kartu overflow-hidden">
        {aset.length === 0 ? (
          <Kosong>Belum ada aset. Mulai dari hasil audit gudang.</Kosong>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel">
              <thead>
                <tr>
                  <th scope="col">Kode</th>
                  <th scope="col">Aset</th>
                  <th scope="col">Kategori</th>
                  <th scope="col" className="angka">Dimiliki</th>
                  <th scope="col" className="angka">Tersewa</th>
                  <th scope="col" className="angka">Diperbaiki</th>
                  <th scope="col" className="angka">Tersedia</th>
                  <th scope="col" className="angka">Harga per hari</th>
                </tr>
              </thead>
              <tbody>
                {aset.map((a) => {
                  const tersewa = pakaiPerHari(sewa, a.id, [hari])[0];
                  const terpakai = pakaiPerHari(semuaPakai, a.id, [hari])[0];
                  return (
                    <tr key={a.id} className={a.aktif ? "" : "opacity-55"}>
                      <td className="font-mono text-xs">{a.kode}</td>
                      <td>
                        <Link href={`/sistem/aset/${a.id}`} className="font-semibold underline underline-offset-2">{a.nama} {a.ukuran}</Link>
                        {!a.aktif && <span className="ml-2 text-xs">(nonaktif)</span>}
                      </td>
                      <td>{a.kategori}</td>
                      <td className="angka">{a.jumlah} {a.satuan}</td>
                      <td className="angka">{tersewa}</td>
                      <td className="angka">{terpakai - tersewa}</td>
                      <td className="angka font-semibold">{a.jumlah - terpakai}</td>
                      <td className="angka">{rupiah(a.harga)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
