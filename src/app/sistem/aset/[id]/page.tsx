import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormAset } from "@/komponen/form-aset";
import { Bidang, Kepala, Kosong, nilai, Pesan, type Cari } from "@/komponen/ui";
import { UnggahFoto } from "@/komponen/unggah-foto";
import { hapusFoto, jadikanSampul, selesaiPerawatan, tambahPerawatan } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import { fotoAset, type Aset } from "@/lib/data";
import { satu, semua } from "@/lib/db";
import { hariIni, rupiah, tanggal } from "@/lib/format";
import { boleh, MAKS_FOTO_PER_ASET } from "@/lib/hitung";

export const metadata: Metadata = { title: "Aset" };

export default async function DetailAset({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const u = await wajib("aset.lihat");
  const a = satu<Aset>("SELECT * FROM aset WHERE id = ?", Number((await params).id) || 0);
  if (!a) notFound();
  const tulis = boleh(u.peran, "aset.tulis");
  const foto = fotoAset(a.id);
  const sp = await searchParams;
  const rawat = semua<{ id: number; jumlah: number; mulai: string; selesai: string | null; catatan: string }>(
    "SELECT * FROM perawatan WHERE aset_id = ? ORDER BY selesai IS NOT NULL, mulai DESC LIMIT 30",
    a.id,
  );
  return (
    <>
      <Kepala judul={`${a.nama} ${a.ukuran}`} ket={`${a.kode}. ${a.jumlah} ${a.satuan}, ${rupiah(a.harga)} per hari.`} />
      <Pesan galat={nilai(sp.galat)} ok={nilai(sp.ok) || undefined} />
      {tulis && (
        <section className="kartu mb-5 p-4">
          <h2 className="mb-3 text-sm font-bold">Data aset</h2>
          <FormAset aset={a} />
        </section>
      )}
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/foto/${f.berkas}`} alt={`Foto ${i + 1} ${a.nama} ${a.ukuran}`} className="size-full object-cover" loading="lazy" />
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
        <h2 className="mb-1 text-sm font-bold">Perawatan dan perbaikan</h2>
        <p className="mb-3 text-xs text-tinta-lembut">Unit yang sedang diperbaiki tidak dihitung tersedia sampai ditandai selesai.</p>
        {rawat.length === 0 ? (
          <Kosong>Belum ada catatan perawatan.</Kosong>
        ) : (
          <table className="tabel mb-3">
            <thead>
              <tr><th scope="col">Mulai</th><th scope="col">Selesai</th><th scope="col" className="angka">Unit</th><th scope="col">Catatan</th><th scope="col"><span className="sr-only">Aksi</span></th></tr>
            </thead>
            <tbody>
              {rawat.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{tanggal(r.mulai)}</td>
                  <td className="whitespace-nowrap">{r.selesai ? tanggal(r.selesai) : "Masih diperbaiki"}</td>
                  <td className="angka">{r.jumlah}</td>
                  <td>{r.catatan}</td>
                  <td>
                    {tulis && !r.selesai && (
                      <form action={selesaiPerawatan.bind(null, r.id)}>
                        <button className="tombol tombol-kecil">Tandai selesai</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tulis && (
          <form action={tambahPerawatan.bind(null, a.id)} className="flex flex-wrap items-end gap-2 border-t border-garis pt-3">
            <Bidang label="Unit" id="rawat_jumlah">
              <input className="isian w-24" id="rawat_jumlah" name="jumlah" type="number" min={1} max={a.jumlah} required defaultValue={1} />
            </Bidang>
            <Bidang label="Mulai" id="rawat_mulai">
              <input className="isian" id="rawat_mulai" name="mulai" type="date" required defaultValue={hariIni()} />
            </Bidang>
            <Bidang label="Catatan" id="rawat_catatan" className="min-w-48 flex-1">
              <input className="isian" id="rawat_catatan" name="catatan" maxLength={300} placeholder="Atap sobek, rangka bengkok" />
            </Bidang>
            <button className="tombol tombol-tinta">Catat perawatan</button>
          </form>
        )}
      </section>
    </>
  );
}
