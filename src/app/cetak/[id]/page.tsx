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

// Kalimat tentang ketersediaan tenda di dokumen penawaran, menurut status pesanannya. Pesanan selesai atau batal
// tidak diberi kalimat.
const CATATAN_KUNCI: Record<string, string> = {
  penawaran: "Ketersediaan tenda dikunci sesudah booking dikonfirmasi.",
  booking: "Booking sudah dikonfirmasi. Tenda untuk tanggal acara ini sudah dikunci.",
  berjalan: "Booking sudah dikonfirmasi. Tenda untuk tanggal acara ini sudah dikunci.",
};

export default async function Cetak({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const u = await wajib("pesanan.lihat");
  // Dokumen ini memuat harga serta telepon dan email pelanggan.
  if (!(await lihatNilai(u.peran))) redirect(`/sistem?galat=${encodeURIComponent("Akun ini tidak punya akses ke halaman itu.")}`);
  const p = await ambilPesanan(Number((await params).id) || 0);
  if (!p) notFound();
  // Faktur hanya ada sesudah diterbitkan. Sebelum itu halaman ini selalu mencetak penawaran.
  const faktur = nilai((await searchParams).jenis) === "faktur" && !!p.tgl_faktur;
  const [s, k, baris] = await Promise.all([
    pengaturan(),
    satu<Kontak>("SELECT * FROM kontak WHERE id = ?", p.kontak_id).then((k) => k!),
    barisPesanan(p.id),
  ]);
  return (
    <main className="mx-auto max-w-[210mm] p-4 print:p-0">
      <div className="tanpa-cetak mb-4 flex justify-end"><TombolCetak /></div>
      <article className="bg-white p-5 text-sm text-tinta shadow sm:p-10 print:p-0 print:shadow-none">
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

        <section className="grid gap-4 py-5 sm:grid-cols-2 sm:gap-6 print:grid-cols-2 print:gap-6">
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

        {/* Di layar HP tabel ini memakai pola tabel-susun: jumlah, hari, dan harga diringkas di bawah keterangan
            dan nilai rata kanan. Cetakan selalu tabel lengkap karena pola itu hanya berlaku untuk layar. */}
        <table className="tabel tabel-susun">
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
                <td>
                  {b.deskripsi}
                  <span className="block text-xs text-tinta-lembut md:hidden print:hidden">
                    {b.jumlah} × {b.hari} hari × {rupiah(b.harga)}
                  </span>
                </td>
                <td className="angka susun-sembunyi">{b.jumlah}</td>
                <td className="angka susun-sembunyi">{b.hari}</td>
                <td className="angka susun-sembunyi">{rupiah(b.harga)}</td>
                <td className="angka susun-kanan">{rupiah(nilaiBaris(b))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 grid w-full max-w-72 grid-cols-2 gap-y-1 border-t-2 border-tinta pt-3">
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
        {!faktur && CATATAN_KUNCI[p.status] && <p className="mt-6 text-xs text-tinta-lembut">{CATATAN_KUNCI[p.status]}</p>}
      </article>
    </main>
  );
}
