import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormKontak } from "@/komponen/formulir";
import { Kepala, Kosong, Lencana, nilai, Pesan, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { daftarPesanan, type Kontak } from "@/lib/data";
import { satu } from "@/lib/db";
import { rupiah, tanggal } from "@/lib/format";
import { boleh } from "@/lib/hitung";

export const metadata: Metadata = { title: "Kontak" };

export default async function DetailKontak({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const u = await wajib("kontak.lihat");
  const k = satu<Kontak>("SELECT * FROM kontak WHERE id = ?", Number((await params).id) || 0);
  if (!k) notFound();
  const galat = nilai((await searchParams).galat);
  const pesanan = daftarPesanan("WHERE p.kontak_id = ? ORDER BY p.mulai DESC", k.id);
  return (
    <>
      <Kepala judul={k.nama} ket={`${k.perusahaan || "Perorangan"}. Masuk ${tanggal(k.dibuat)}${k.sumber && ` lewat ${k.sumber}`}.`}>
        {boleh(u.peran, "pesanan.tulis") && (
          <Link href={`/sistem/pesanan/baru?kontak=${k.id}`} className="tombol tombol-utama">
            Buat penawaran
          </Link>
        )}
      </Kepala>
      <Pesan galat={galat} />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="kartu p-4">
          <h2 className="mb-3 text-sm font-bold">Data kontak</h2>
          {boleh(u.peran, "kontak.tulis") ? (
            <FormKontak kontak={k} />
          ) : (
            <dl className="space-y-1 text-sm">
              <div><dt className="inline text-tinta-lembut">Telepon: </dt><dd className="inline">{k.telepon || "Belum diisi"}</dd></div>
              <div><dt className="inline text-tinta-lembut">Email: </dt><dd className="inline">{k.email || "Belum diisi"}</dd></div>
              <div><dt className="inline text-tinta-lembut">Tahap: </dt><dd className="inline"><Lencana nilai={k.tahap} /></dd></div>
              <div><dt className="text-tinta-lembut">Kebutuhan</dt><dd className="whitespace-pre-line">{k.kebutuhan || "Belum diisi"}</dd></div>
            </dl>
          )}
        </section>
        <section className="kartu overflow-hidden">
          <h2 className="p-4 pb-2 text-sm font-bold">Riwayat pesanan</h2>
          {pesanan.length === 0 ? (
            <Kosong>Belum ada penawaran untuk kontak ini.</Kosong>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabel">
                <thead>
                  <tr><th scope="col">Nomor</th><th scope="col">Acara</th><th scope="col">Pasang</th><th scope="col">Status</th><th scope="col" className="angka">Total</th></tr>
                </thead>
                <tbody>
                  {pesanan.map((p) => (
                    <tr key={p.id}>
                      <td><Link href={`/sistem/pesanan/${p.id}`} className="font-semibold underline underline-offset-2">{p.nomor}</Link></td>
                      <td>{p.acara}</td>
                      <td className="whitespace-nowrap">{tanggal(p.mulai)}</td>
                      <td><Lencana nilai={p.status} /></td>
                      <td className="angka">{rupiah(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
