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
      <div className="kartu">
        {pesanan.length === 0 ? (
          <Kosong>Belum ada pesanan di saringan ini.</Kosong>
        ) : (
          // Di HP tiap pesanan menjadi blok: nomor, acara, pelanggan, dan tanggal di kiri, lalu status, total, dan
          // sisa tagihan di kanan.
          <table className="tabel tabel-susun">
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
              {pesanan.map((p) => {
                const tagih = p.status !== "penawaran" && p.status !== "batal";
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">
                      <Link href={`/sistem/pesanan/${p.id}`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2 md:min-h-0">
                        {p.nomor}
                      </Link>
                    </td>
                    <td className="font-semibold md:font-normal">{p.acara}</td>
                    <td className="text-tinta-lembut md:text-tinta">
                      {p.kontak}
                      {p.perusahaan && <span className="text-xs text-tinta-lembut max-md:before:content-[',_'] md:block">{p.perusahaan}</span>}
                    </td>
                    <td className="text-tinta-lembut md:whitespace-nowrap md:text-tinta">{tanggal(p.mulai)} sampai {tanggal(p.selesai)}</td>
                    <td className="susun-kanan max-md:self-center"><Lencana nilai={p.status} /></td>
                    {tampakNilai && (
                      <td className="angka susun-kanan">
                        <span className="text-xs text-tinta-lembut md:hidden">Total </span>
                        {rupiah(p.total)}
                      </td>
                    )}
                    {tampakNilai && (
                      <td className={`angka susun-kanan ${tagih ? "" : "max-md:hidden"} ${tagih && p.sisa > 0 ? "font-semibold" : "text-rumput"}`}>
                        {tagih &&
                          (p.sisa > 0 ? (
                            <>
                              <span className="text-xs font-normal text-tinta-lembut md:hidden">Sisa </span>
                              {rupiah(p.sisa)}
                            </>
                          ) : (
                            "Lunas"
                          ))}
                      </td>
                    )}
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
