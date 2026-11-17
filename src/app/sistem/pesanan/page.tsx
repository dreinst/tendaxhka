import type { Metadata } from "next";
import Link from "next/link";
import { Kepala, Kosong, Lencana, nilai, Pesan, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { daftarPesanan, lihatNilai } from "@/lib/data";
import { LABEL_STATUS, rupiah, tanggal } from "@/lib/format";
import { boleh } from "@/lib/hitung";

export const metadata: Metadata = { title: "Pesanan" };

export default async function HalamanPesanan({ searchParams }: { searchParams: Cari }) {
  const u = await wajib("pesanan.lihat");
  const sp = await searchParams;
  const tampakNilai = await lihatNilai(u.peran);
  const status = nilai(sp.status) in LABEL_STATUS ? nilai(sp.status) : "";
  const pesanan = await (status
    ? daftarPesanan("WHERE p.status = ? ORDER BY p.mulai DESC LIMIT 200", status)
    : daftarPesanan("WHERE p.status <> 'batal' ORDER BY p.mulai DESC LIMIT 200"));
  return (
    <>
      <Kepala judul="Pesanan" ket="Dari penawaran, booking, pelaksanaan, sampai faktur lunas.">
        {boleh(u.peran, "pesanan.tulis") && (
          <Link href="/sistem/pesanan/baru" className="tombol tombol-utama">
            Penawaran baru
          </Link>
        )}
      </Kepala>
      <Pesan galat={nilai(sp.galat)} />
      <nav aria-label="Saring status" className="mb-4 flex flex-wrap gap-2">
        <Link href="/sistem/pesanan" className={`tombol tombol-kecil ${status ? "" : "tombol-tinta"}`}>Semua aktif</Link>
        {Object.entries(LABEL_STATUS).map(([v, t]) => (
          <Link key={v} href={`/sistem/pesanan?status=${v}`} className={`tombol tombol-kecil ${status === v ? "tombol-tinta" : ""}`}>
            {t}
          </Link>
        ))}
      </nav>
      <div className="kartu overflow-hidden">
        {pesanan.length === 0 ? (
          <Kosong>Belum ada pesanan di saringan ini.</Kosong>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel">
              <thead>
                <tr>
                  <th scope="col">Nomor</th>
                  <th scope="col">Acara</th>
                  <th scope="col">Pelanggan</th>
                  <th scope="col">Pasang sampai bongkar</th>
                  <th scope="col">Status</th>
                  {tampakNilai && <th scope="col" className="angka">Total</th>}
                  {tampakNilai && <th scope="col" className="angka">Sisa tagihan</th>}
                </tr>
              </thead>
              <tbody>
                {pesanan.map((p) => (
                  <tr key={p.id}>
                    <td><Link href={`/sistem/pesanan/${p.id}`} className="font-semibold underline underline-offset-2">{p.nomor}</Link></td>
                    <td>{p.acara}</td>
                    <td>{p.kontak}{p.perusahaan && <span className="block text-xs text-tinta-lembut">{p.perusahaan}</span>}</td>
                    <td className="whitespace-nowrap">{tanggal(p.mulai)} sampai {tanggal(p.selesai)}</td>
                    <td><Lencana nilai={p.status} /></td>
                    {tampakNilai && <td className="angka">{rupiah(p.total)}</td>}
                    {tampakNilai && <td className="angka">{p.status === "penawaran" || p.status === "batal" ? "" : rupiah(p.sisa)}</td>}
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
