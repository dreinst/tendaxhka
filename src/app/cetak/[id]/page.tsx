import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TombolCetak } from "@/komponen/tombol-cetak";
import { nilai, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { ambilPesanan, barisPesanan, lihatNilai, pengaturan, type Kontak } from "@/lib/data";
import { satu } from "@/lib/db";
import { rupiah, tanggal } from "@/lib/format";
import { nilaiBaris } from "@/lib/hitung";

export const metadata: Metadata = { title: "Cetak dokumen", robots: { index: false, follow: false } };

export default async function Cetak({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const u = await wajib("pesanan.lihat");
  // Dokumen ini memuat harga serta telepon dan email pelanggan.
  if (!lihatNilai(u.peran)) redirect(`/sistem?galat=${encodeURIComponent("Akun ini tidak punya akses ke halaman itu.")}`);
  const p = ambilPesanan(Number((await params).id) || 0);
  if (!p) notFound();
  // Faktur hanya ada sesudah diterbitkan. Sebelum itu halaman ini selalu mencetak penawaran.
  const faktur = nilai((await searchParams).jenis) === "faktur" && !!p.tgl_faktur;
  const s = pengaturan();
  const k = satu<Kontak>("SELECT * FROM kontak WHERE id = ?", p.kontak_id)!;
  const baris = barisPesanan(p.id);
  return (
    <main className="mx-auto max-w-[210mm] p-4 print:p-0">
      <div className="tanpa-cetak mb-4 flex justify-end"><TombolCetak /></div>
      <article className="bg-white p-10 text-sm text-tinta shadow print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-4 border-terpal pb-5">
          <div>
            <p className="font-judul text-xl font-bold">{s.nama_usaha}</p>
            {s.alamat && <p className="mt-1 max-w-xs text-xs">{s.alamat}</p>}
            <p className="text-xs">{[s.telepon, s.email].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold uppercase">{faktur ? "Faktur" : "Penawaran"}</h1>
            <p className="font-semibold">{faktur ? `INV-${p.nomor}` : p.nomor}</p>
            <p className="text-xs">Tanggal {tanggal(faktur ? p.tgl_faktur : p.dibuat)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase text-tinta-lembut">Kepada</p>
            <p className="font-semibold">{k.nama}</p>
            {k.perusahaan && <p>{k.perusahaan}</p>}
            <p>{[k.telepon, k.email].filter(Boolean).join(" · ")}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-tinta-lembut">Acara</p>
            <p className="font-semibold">{p.acara}</p>
            {p.lokasi && <p>{p.lokasi}</p>}
            <p>Pasang {tanggal(p.mulai)}, bongkar {tanggal(p.selesai)}</p>
          </div>
        </section>

        <table className="tabel">
          <thead>
            <tr>
              <th scope="col">Keterangan</th>
              <th scope="col" className="angka">Jumlah</th>
              <th scope="col" className="angka">Hari</th>
              <th scope="col" className="angka">Harga</th>
              <th scope="col" className="angka">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.id}>
                <td>{b.deskripsi}</td>
                <td className="angka">{b.jumlah}</td>
                <td className="angka">{b.hari}</td>
                <td className="angka">{rupiah(b.harga)}</td>
                <td className="angka">{rupiah(nilaiBaris(b))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 grid w-72 grid-cols-2 gap-y-1 border-t-2 border-tinta pt-3">
          {p.diskon > 0 && (
            <>
              <dt>Subtotal</dt><dd className="angka">{rupiah(p.subtotal)}</dd>
              <dt>Diskon</dt><dd className="angka">{rupiah(-p.diskon)}</dd>
            </>
          )}
          <dt className="font-bold">Total</dt><dd className="angka font-bold">{rupiah(p.total)}</dd>
          {faktur && (
            <>
              <dt>Sudah dibayar</dt><dd className="angka">{rupiah(p.dibayar)}</dd>
              <dt className="font-bold">Sisa tagihan</dt><dd className="angka font-bold">{rupiah(p.sisa)}</dd>
            </>
          )}
        </dl>

        {p.catatan && <p className="mt-6"><span className="font-semibold">Catatan:</span> {p.catatan}</p>}
        {faktur && s.rekening && <p className="mt-2"><span className="font-semibold">Pembayaran ke:</span> {s.rekening}</p>}
        {!faktur && <p className="mt-6 text-xs text-tinta-lembut">Ketersediaan tenda dikunci sesudah booking dikonfirmasi.</p>}
      </article>
    </main>
  );
}
