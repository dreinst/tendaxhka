import type { Metadata } from "next";
import Link from "next/link";
import { FormAset } from "@/komponen/form-aset";
import { Panel } from "@/komponen/panel";
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
  const [aset, sewa, semuaPakai] = await Promise.all([
    semua<Aset>("SELECT * FROM aset ORDER BY aktif DESC, kategori, nama, ukuran"),
    daftarPakai(hari, hari, { perawatan: false }),
    daftarPakai(hari, hari),
  ]);
  return (
    <>
      <Kepala judul="Aset" ket="Jumlah yang dimiliki, yang sedang tersewa, dan yang sedang diperbaiki hari ini.">
        {tulis && (
          <Panel tombol="Tambah aset" kelasTombol="tombol tombol-utama" judul="Tambah aset" ket="Foto untuk katalog ditambahkan sesudah aset tersimpan." lebar="lebar">
            <FormAset />
          </Panel>
        )}
      </Kepala>
      <Pesan galat={nilai((await searchParams).galat)} />
      <div className="kartu">
        {aset.length === 0 ? (
          <Kosong>Belum ada aset. Mulai dari hasil audit gudang.</Kosong>
        ) : (
          // Di HP tiap aset menjadi blok: nama, kode, dan kategori di kiri, lalu unit tersedia dan harga di kanan.
          // Rincian dimiliki, tersewa, dan diperbaiki diringkas di bawah nama.
          <table className="tabel tabel-susun">
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
                const rusak = terpakai - tersewa;
                return (
                  <tr key={a.id} className={a.aktif ? "" : "opacity-55"}>
                    <td className="susun-sembunyi whitespace-nowrap font-mono text-xs">{a.kode}</td>
                    <td className="max-md:row-span-2">
                      <Link href={`/sistem/aset/${a.id}`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2 md:min-h-0">
                        {a.nama} {a.ukuran}
                      </Link>
                      {!a.aktif && <span className="ml-2 text-xs">(nonaktif)</span>}
                      <span className="block text-xs text-tinta-lembut md:hidden">
                        <span className="whitespace-nowrap font-mono">{a.kode}</span>, {a.kategori}. Punya {a.jumlah} {a.satuan}
                        {tersewa > 0 && `, tersewa ${tersewa}`}
                        {rusak > 0 && `, diperbaiki ${rusak}`}
                      </span>
                    </td>
                    <td className="susun-sembunyi">{a.kategori}</td>
                    <td className="angka susun-sembunyi">{a.jumlah} {a.satuan}</td>
                    <td className="angka susun-sembunyi">{tersewa}</td>
                    <td className="angka susun-sembunyi">{rusak}</td>
                    <td className="angka susun-kanan font-semibold max-md:self-center">
                      <span className="text-xs font-normal text-tinta-lembut md:hidden">Tersedia </span>
                      {a.jumlah - terpakai}
                    </td>
                    <td className="angka susun-kanan">
                      {rupiah(a.harga)}
                      <span className="text-xs text-tinta-lembut md:hidden">/hari</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
