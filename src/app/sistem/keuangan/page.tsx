import type { Metadata } from "next";
import Link from "next/link";
import { Bidang, Kepala, Kosong, nilai, Pesan, type Cari } from "@/komponen/ui";
import { hapusBiaya, tambahBiaya } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import { daftarPesanan, labaBulan, pengaturan, type Biaya } from "@/lib/data";
import { semua } from "@/lib/db";
import { hariIni, namaBulan, rupiah, tanggal } from "@/lib/format";
import { batasBulan, boleh, bulanSah, geserBulanSah } from "@/lib/hitung";

export const metadata: Metadata = { title: "Keuangan" };

export default async function Keuangan({ searchParams }: { searchParams: Cari }) {
  const u = await wajib("keuangan.lihat");
  const tulis = boleh(u.peran, "keuangan.tulis");
  const sp = await searchParams;
  const hari = hariIni();
  const bulan = bulanSah(nilai(sp.bulan)) ? nilai(sp.bulan) : hari.slice(0, 7);
  const sebelumnya = geserBulanSah(bulan, -1);
  const berikutnya = geserBulanSah(bulan, 1);
  const { awal, akhir } = batasBulan(bulan);
  const laba = labaBulan(bulan);
  const basis = pengaturan().basis;
  const biaya = semua<Biaya>(
    "SELECT b.*, p.nomor FROM biaya b LEFT JOIN pesanan p ON p.id = b.pesanan_id WHERE b.tanggal BETWEEN ? AND ? ORDER BY b.tanggal, b.id",
    awal,
    akhir,
  );
  const masuk = semua<{ id: number; tanggal: string; jumlah: number; metode: string; catatan: string; pesanan_id: number; nomor: string; acara: string }>(
    `SELECT b.*, p.nomor, p.acara FROM pembayaran b JOIN pesanan p ON p.id = b.pesanan_id
     WHERE b.tanggal BETWEEN ? AND ? ORDER BY b.tanggal, b.id`,
    awal,
    akhir,
  );
  const piutang = daftarPesanan("WHERE p.status IN ('booking', 'berjalan', 'selesai') ORDER BY p.mulai").filter((p) => p.sisa > 0);
  return (
    <>
      <Kepala judul="Keuangan" ket={`${namaBulan(bulan)}. Pendapatan dihitung dengan basis ${basis === "kas" ? "kas (uang yang diterima)" : "akrual (faktur yang terbit)"}.`}>
        {sebelumnya && <Link href={`/sistem/keuangan?bulan=${sebelumnya}`} className="tombol tombol-kecil">Bulan sebelumnya</Link>}
        {berikutnya && <Link href={`/sistem/keuangan?bulan=${berikutnya}`} className="tombol tombol-kecil">Bulan berikutnya</Link>}
      </Kepala>
      <Pesan galat={nilai(sp.galat)} />
      {laba.dikunci && <Pesan ok={`Periode ini sudah ditutup pada ${tanggal(laba.dikunci.slice(0, 10))}. Transaksi di bulan ini tidak bisa ditambah atau dihapus.`} />}

      <section aria-label="Ringkasan" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Pendapatan", laba.pendapatan],
          ["Biaya langsung", laba.biayaLangsung],
          ["Biaya operasional", laba.biayaOperasional],
          ["Nett profit", laba.labaBersih],
        ].map(([label, n]) => (
          <div key={label} className="kartu p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">{label}</p>
            <p className="mt-1 font-judul text-lg font-bold tabular-nums">{rupiah(n as number)}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="kartu p-4">
          <h2 className="mb-3 text-sm font-bold">Biaya bulan ini</h2>
          {biaya.length === 0 ? (
            <Kosong>Belum ada biaya di bulan ini.</Kosong>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabel mb-3">
                <thead>
                  <tr><th scope="col">Tanggal</th><th scope="col">Kategori</th><th scope="col">Untuk</th><th scope="col" className="angka">Jumlah</th><th scope="col"><span className="sr-only">Aksi</span></th></tr>
                </thead>
                <tbody>
                  {biaya.map((b) => (
                    <tr key={b.id}>
                      <td className="whitespace-nowrap">{tanggal(b.tanggal)}</td>
                      <td>{b.kategori}{b.keterangan && <span className="block text-xs text-tinta-lembut">{b.keterangan}</span>}</td>
                      <td>{b.pesanan_id ? <Link href={`/sistem/pesanan/${b.pesanan_id}`} className="underline">{b.nomor}</Link> : "Operasional"}</td>
                      <td className="angka">{rupiah(b.jumlah)}</td>
                      <td>
                        {tulis && !laba.dikunci && (
                          <form action={hapusBiaya.bind(null, b.id)}>
                            <button className="text-xs text-terpal-gelap underline" aria-label={`Hapus biaya ${b.kategori} ${tanggal(b.tanggal)}`}>Hapus</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tulis && (
            <form action={tambahBiaya} className="grid grid-cols-2 gap-2 border-t border-garis pt-3">
              <p className="col-span-2 text-xs text-tinta-lembut">Formulir ini untuk biaya operasional (gaji, sewa gudang, listrik). Biaya milik satu pesanan dicatat di halaman pesanannya.</p>
              <Bidang label="Tanggal" id="tanggal">
                <input className="isian" id="tanggal" name="tanggal" type="date" required defaultValue={hari.startsWith(bulan) ? hari : awal} />
              </Bidang>
              <Bidang label="Jumlah (Rp)" id="jumlah">
                <input className="isian" id="jumlah" name="jumlah" inputMode="numeric" required />
              </Bidang>
              <Bidang label="Kategori" id="kategori">
                <input className="isian" id="kategori" name="kategori" required maxLength={60} />
              </Bidang>
              <Bidang label="Keterangan" id="keterangan">
                <input className="isian" id="keterangan" name="keterangan" maxLength={300} />
              </Bidang>
              <div className="col-span-2"><button className="tombol tombol-tinta">Catat biaya operasional</button></div>
            </form>
          )}
        </section>

        <div className="space-y-5">
          <section className="kartu p-4">
            <h2 className="mb-3 text-sm font-bold">Uang masuk bulan ini</h2>
            {masuk.length === 0 ? (
              <Kosong>Belum ada pembayaran di bulan ini.</Kosong>
            ) : (
              <table className="tabel">
                <tbody>
                  {masuk.map((b) => (
                    <tr key={b.id}>
                      <td className="whitespace-nowrap">{tanggal(b.tanggal)}</td>
                      <td><Link href={`/sistem/pesanan/${b.pesanan_id}`} className="underline">{b.nomor}</Link> {b.acara}</td>
                      <td className="angka">{rupiah(b.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className="kartu p-4">
            <h2 className="mb-3 text-sm font-bold">Piutang berjalan, {rupiah(piutang.reduce((s, p) => s + p.sisa, 0))}</h2>
            {piutang.length === 0 ? (
              <Kosong>Semua pesanan sudah lunas.</Kosong>
            ) : (
              <table className="tabel">
                <tbody>
                  {piutang.map((p) => (
                    <tr key={p.id}>
                      <td><Link href={`/sistem/pesanan/${p.id}`} className="underline">{p.nomor}</Link></td>
                      <td>{p.kontak}<span className="block text-xs text-tinta-lembut">{p.acara}, {tanggal(p.mulai)}</span></td>
                      <td className="angka">{rupiah(p.sisa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
