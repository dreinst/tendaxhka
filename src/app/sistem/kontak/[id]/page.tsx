import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormKontak } from "@/komponen/formulir";
import { Panel } from "@/komponen/panel";
import { JudulKartu, Kepala, Lencana, nilai, Pesan, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { daftarPesanan, type Kontak } from "@/lib/data";
import { satu } from "@/lib/db";
import { rupiah, tanggal } from "@/lib/format";
import { boleh } from "@/lib/hitung";

export const metadata: Metadata = { title: "Kontak" };

export default async function DetailKontak({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const u = await wajib("kontak.lihat");
  const k = await satu<Kontak>("SELECT * FROM kontak WHERE id = ?", Number((await params).id) || 0);
  if (!k) notFound();
  const galat = nilai((await searchParams).galat);
  const pesanan = await daftarPesanan("WHERE p.kontak_id = ? ORDER BY p.mulai DESC", k.id);
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
      {/* items-start: kartu data dan riwayat masing-masing setinggi isinya. */}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
        <section className="kartu min-w-0 p-4">
          <JudulKartu judul="Data kontak">
            {boleh(u.peran, "kontak.tulis") && (
              <Panel tombol="Ubah" labelTombol="Ubah data kontak" judul={`Ubah data ${k.nama}`} lebar="lebar">
                <FormKontak kontak={k} />
              </Panel>
            )}
          </JudulKartu>
          <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-tinta-lembut">Tahap</dt>
            <dd><Lencana nilai={k.tahap} /></dd>
            <dt className="text-tinta-lembut">Telepon</dt>
            <dd>
              {k.telepon ? (
                <a href={`tel:${k.telepon.replace(/[^\d+]/g, "")}`} className="-my-3 inline-flex min-h-11 items-center underline underline-offset-2">{k.telepon}</a>
              ) : (
                <span className="text-tinta-lembut">Belum diisi</span>
              )}
            </dd>
            <dt className="text-tinta-lembut">Email</dt>
            <dd className="break-words">{k.email || <span className="text-tinta-lembut">Belum diisi</span>}</dd>
            <dt className="text-tinta-lembut">Jenis</dt>
            <dd>{k.jenis === "korporat" ? "Korporat" : "Perorangan"}</dd>
            <dt className="text-tinta-lembut">Sumber</dt>
            <dd>{k.sumber || <span className="text-tinta-lembut">Belum diisi</span>}</dd>
            {k.tahap !== "menang" && k.tahap !== "kalah" && (
              <>
                <dt className="text-tinta-lembut">Tindak lanjut</dt>
                <dd>{k.tindak_lanjut ? tanggal(k.tindak_lanjut) : <span className="text-tinta-lembut">Belum dijadwalkan</span>}</dd>
              </>
            )}
            <dt className="col-span-2 mt-1 text-tinta-lembut">Kebutuhan dan catatan</dt>
            <dd className="col-span-2 whitespace-pre-line">{k.kebutuhan || <span className="text-tinta-lembut">Belum diisi</span>}</dd>
          </dl>
        </section>
        <section className="kartu min-w-0 p-4">
          <JudulKartu judul="Riwayat pesanan" />
          {pesanan.length === 0 ? (
            <p className="text-sm text-tinta-lembut">Belum ada penawaran untuk kontak ini.</p>
          ) : (
            <table className="tabel tabel-susun">
              <thead>
                <tr><th scope="col">Nomor</th><th scope="col">Acara</th><th scope="col">Pasang</th><th scope="col">Status</th><th scope="col" className="angka">Total</th></tr>
              </thead>
              <tbody>
                {pesanan.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">
                      <Link href={`/sistem/pesanan/${p.id}`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2 md:min-h-0">{p.nomor}</Link>
                    </td>
                    <td>{p.acara}</td>
                    <td className="whitespace-nowrap text-tinta-lembut md:text-tinta">{tanggal(p.mulai)}</td>
                    <td className="susun-kanan max-md:self-center"><Lencana nilai={p.status} /></td>
                    <td className="angka susun-kanan">{rupiah(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
