import type { Metadata } from "next";
import Image from "next/image";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { FormAset } from "@/komponen/form-aset";
import { Panel } from "@/komponen/panel";
import { Bidang, JudulKartu, Kepala, nilai, Pesan, type Cari } from "@/komponen/ui";
import { UnggahFoto } from "@/komponen/unggah-foto";
import { hapusFoto, jadikanSampul, selesaiPerawatan, tambahPerawatan } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import { fotoAset, type Aset } from "@/lib/data";
import { satu, semua } from "@/lib/db";
import { hariIni, rupiah, tanggal } from "@/lib/format";
import { boleh, MAKS_FOTO_PER_ASET, urlFoto } from "@/lib/hitung";

export const metadata: Metadata = { title: "Aset" };

export default async function DetailAset({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const u = await wajib("aset.lihat");
  const a = await satu<Aset>("SELECT * FROM aset WHERE id = ?", Number((await params).id) || 0);
  if (!a) notFound();
  const tulis = boleh(u.peran, "aset.tulis");
  const sp = await searchParams;
  const [foto, rawat] = await Promise.all([
    fotoAset(a.id),
    semua<{ id: number; jumlah: number; mulai: string; selesai: string | null; catatan: string }>(
      "SELECT * FROM perawatan WHERE aset_id = ? ORDER BY selesai IS NOT NULL, mulai DESC LIMIT 30",
      a.id,
    ),
  ]);
  return (
    <>
      <Kepala judul={`${a.nama} ${a.ukuran}`} ket={`${a.kode}. ${a.jumlah} ${a.satuan}, ${rupiah(a.harga)} per hari.`} />
      <Pesan galat={nilai(sp.galat)} ok={nilai(sp.ok) || undefined} />
      <section className="kartu mb-5 p-4">
        <JudulKartu judul="Data aset">
          {tulis && (
            <Panel tombol="Ubah" labelTombol="Ubah data aset" judul={`Ubah ${a.nama} ${a.ukuran}`.trim()} lebar="lebar">
              <FormAset aset={a} />
            </Panel>
          )}
        </JudulKartu>
        <dl className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm md:grid-cols-[8.5rem_minmax(0,1fr)_8.5rem_minmax(0,1fr)]">
          {(
            [
              ["Kode", <span key="k" className="whitespace-nowrap font-mono">{a.kode}</span>],
              ["Kategori", a.kategori],
              ["Ukuran", a.ukuran],
              ["Jumlah dimiliki", `${a.jumlah} ${a.satuan}`],
              ["Harga per hari", rupiah(a.harga)],
              ["Kapasitas", a.kapasitas],
              ["Cocok untuk", a.cocok],
              ["Status", a.aktif ? "Aktif disewakan" : "Tidak disewakan"],
              ["Katalog website", a.tampil_web ? "Ditampilkan" : "Disembunyikan"],
            ] as const
          ).map(([label, isi]) => (
            <Fragment key={label}>
              <dt className="text-tinta-lembut">{label}</dt>
              <dd>{isi || <span className="text-tinta-lembut">Belum diisi</span>}</dd>
            </Fragment>
          ))}
          <dt className="col-span-2 mt-1 text-tinta-lembut md:col-span-4">Deskripsi untuk website</dt>
          <dd className="col-span-2 md:col-span-4">{a.deskripsi || <span className="text-tinta-lembut">Belum diisi</span>}</dd>
        </dl>
      </section>
      <section id="foto" className="kartu mb-5 scroll-mt-4 p-4">
        <h2 className="mb-1 text-sm font-bold">Foto untuk katalog website</h2>
        <p className="mb-3 text-xs text-tinta-lembut">
          Foto pertama menjadi sampul di katalog. {a.tampil_web ? "" : "Aset ini sedang disembunyikan dari website, jadi fotonya belum terlihat pengunjung."}
        </p>
        {foto.length === 0 ? (
          <p className="mb-3 text-sm text-tinta-lembut">Belum ada foto. Katalog menampilkan ilustrasi sampai foto ditambahkan.</p>
        ) : (
          <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {foto.map((f, i) => (
              <li key={f.id} className="overflow-hidden rounded-[10px] border border-garis bg-white">
                <div className="relative aspect-[4/3] bg-[#ebe3d3]">
                  <Image src={urlFoto(f.berkas)} alt={`Foto ${i + 1} ${a.nama} ${a.ukuran}`} fill sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 46vw" className="object-cover" />
                  {i === 0 && <span className="lencana absolute left-2 top-2 bg-lampu text-tinta">Sampul</span>}
                </div>
                {tulis && (
                  <div className="flex flex-wrap gap-2 p-2">
                    {i > 0 && (
                      <form action={jadikanSampul.bind(null, f.id)}>
                        <button className="tombol tombol-kecil">Jadikan sampul</button>
                      </form>
                    )}
                    <form action={hapusFoto.bind(null, f.id)}>
                      <button className="tombol tombol-kecil text-terpal-gelap" aria-label={`Hapus foto ${i + 1}`}>Hapus</button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {tulis && <UnggahFoto asetId={a.id} sisa={MAKS_FOTO_PER_ASET - foto.length} />}
      </section>
      <section className="kartu p-4">
        <JudulKartu judul="Perawatan dan perbaikan">
          {tulis && (
            <Panel tombol="Catat perawatan" judul="Catat perawatan" ket="Unit yang sedang diperbaiki tidak dihitung tersedia sampai ditandai selesai.">
              <form action={tambahPerawatan.bind(null, a.id)} className="grid grid-cols-2 gap-3">
                <Bidang label="Unit" id="rawat_jumlah">
                  <input className="isian" id="rawat_jumlah" name="jumlah" type="number" min={1} max={a.jumlah} required defaultValue={1} />
                </Bidang>
                <Bidang label="Mulai" id="rawat_mulai">
                  <input className="isian" id="rawat_mulai" name="mulai" type="date" required defaultValue={hariIni()} />
                </Bidang>
                <Bidang label="Catatan" id="rawat_catatan" className="col-span-2">
                  <input className="isian" id="rawat_catatan" name="catatan" maxLength={300} placeholder="Atap sobek, rangka bengkok" />
                </Bidang>
                <div className="col-span-2 pt-1">
                  <button className="tombol tombol-utama">Catat perawatan</button>
                </div>
              </form>
            </Panel>
          )}
        </JudulKartu>
        {rawat.length === 0 ? (
          <p className="text-sm text-tinta-lembut">Belum ada catatan perawatan. Unit yang sedang diperbaiki tidak dihitung tersedia sampai ditandai selesai.</p>
        ) : (
          <table className="tabel tabel-susun md:[&_td]:align-middle">
            <thead>
              <tr><th scope="col">Mulai</th><th scope="col">Selesai</th><th scope="col" className="angka">Unit</th><th scope="col">Catatan</th>{tulis && <th scope="col"><span className="sr-only">Aksi</span></th>}</tr>
            </thead>
            <tbody>
              {rawat.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap font-semibold md:font-normal">{tanggal(r.mulai)}</td>
                  <td className="whitespace-nowrap text-tinta-lembut md:text-tinta">
                    {r.selesai ? <><span className="md:hidden">Selesai </span>{tanggal(r.selesai)}</> : "Masih diperbaiki"}
                  </td>
                  <td className="angka susun-kanan">{r.jumlah}<span className="md:hidden"> unit</span></td>
                  <td className="text-tinta-lembut md:text-tinta">{r.catatan}</td>
                  {tulis && (
                    <td className="susun-kanan w-px py-1">
                      {!r.selesai && (
                        <form action={selesaiPerawatan.bind(null, r.id)}>
                          <button className="tombol tombol-kecil whitespace-nowrap">Tandai selesai</button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
