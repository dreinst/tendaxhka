import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormAset } from "@/komponen/form-aset";
import { Bidang, Kepala, Kosong, nilai, Pesan, type Cari } from "@/komponen/ui";
import { selesaiPerawatan, tambahPerawatan } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import type { Aset } from "@/lib/data";
import { satu, semua } from "@/lib/db";
import { hariIni, rupiah, tanggal } from "@/lib/format";
import { boleh } from "@/lib/hitung";

export const metadata: Metadata = { title: "Aset" };

export default async function DetailAset({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const u = await wajib("aset.lihat");
  const a = satu<Aset>("SELECT * FROM aset WHERE id = ?", Number((await params).id) || 0);
  if (!a) notFound();
  const tulis = boleh(u.peran, "aset.tulis");
  const rawat = semua<{ id: number; jumlah: number; mulai: string; selesai: string | null; catatan: string }>(
    "SELECT * FROM perawatan WHERE aset_id = ? ORDER BY selesai IS NOT NULL, mulai DESC LIMIT 30",
    a.id,
  );
  return (
    <>
      <Kepala judul={`${a.nama} ${a.ukuran}`} ket={`${a.kode}. ${a.jumlah} ${a.satuan}, ${rupiah(a.harga)} per hari.`} />
      <Pesan galat={nilai((await searchParams).galat)} />
      {tulis && (
        <section className="kartu mb-5 p-4">
          <h2 className="mb-3 text-sm font-bold">Data aset</h2>
          <FormAset aset={a} />
        </section>
      )}
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
