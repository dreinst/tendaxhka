import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormPesanan } from "@/komponen/formulir";
import { Bidang, Kepala, Kosong, Lencana, nilai, Pesan, type Cari } from "@/komponen/ui";
import {
  duplikatPesanan,
  hapusBiaya,
  hapusPembayaran,
  hapusPesanan,
  hapusTugas,
  simpanTugas,
  tambahBiaya,
  tambahPembayaran,
  terbitkanFaktur,
  ubahStatus,
} from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import { ambilPesanan, barisPesanan, kekurangan, lihatNilai, type Aset, type Biaya, type Kontak, type Tugas } from "@/lib/data";
import { semua } from "@/lib/db";
import { hariIni, LABEL_TUGAS, rupiah, tanggal } from "@/lib/format";
import { bacaChecklist, boleh, nilaiBaris } from "@/lib/hitung";

export const metadata: Metadata = { title: "Pesanan" };

const LANGKAH: Record<string, { ke: string; teks: string; utama?: boolean }[]> = {
  penawaran: [{ ke: "booking", teks: "Konfirmasi booking", utama: true }, { ke: "batal", teks: "Batalkan" }],
  booking: [{ ke: "berjalan", teks: "Mulai pelaksanaan", utama: true }, { ke: "penawaran", teks: "Kembalikan ke penawaran" }, { ke: "batal", teks: "Batalkan" }],
  berjalan: [{ ke: "selesai", teks: "Tandai selesai", utama: true }],
  selesai: [],
  batal: [{ ke: "penawaran", teks: "Buka lagi sebagai penawaran" }],
};

export default async function DetailPesanan({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const u = await wajib("pesanan.lihat");
  const p = ambilPesanan(Number((await params).id) || 0);
  if (!p) notFound();
  const galat = nilai((await searchParams).galat);
  const tulis = boleh(u.peran, "pesanan.tulis");
  const lihatUang = boleh(u.peran, "keuangan.lihat");
  const tampakNilai = lihatNilai(u.peran);
  const tulisUang = boleh(u.peran, "keuangan.tulis");
  const tulisJadwal = boleh(u.peran, "jadwal.tulis");
  const bisaUbah = tulis && p.status !== "selesai" && p.status !== "batal";
  const dipesan = p.status !== "penawaran" && p.status !== "batal";

  const baris = barisPesanan(p.id);
  const kurang = p.status === "penawaran" ? kekurangan(p.id) : [];
  const bayar = tampakNilai
    ? semua<{ id: number; tanggal: string; jumlah: number; metode: string; catatan: string }>(
        "SELECT * FROM pembayaran WHERE pesanan_id = ? ORDER BY tanggal, id",
        p.id,
      )
    : [];
  const biaya = lihatUang ? semua<Biaya>("SELECT *, NULL AS nomor FROM biaya WHERE pesanan_id = ? ORDER BY tanggal, id", p.id) : [];
  const totalBiaya = biaya.reduce((s, b) => s + b.jumlah, 0);
  const tugas = semua<Tugas>("SELECT *, '' AS nomor, '' AS acara, '' AS lokasi FROM tugas WHERE pesanan_id = ? ORDER BY tanggal, id", p.id);
  const hari = hariIni();

  return (
    <>
      <Kepala judul={`${p.nomor} · ${p.acara}`} ket={`${p.kontak}${p.perusahaan && `, ${p.perusahaan}`}. Pasang ${tanggal(p.mulai)}, bongkar ${tanggal(p.selesai)}.`}>
        <Lencana nilai={p.status} />
        {tampakNilai && <Link href={`/cetak/${p.id}?jenis=penawaran`} target="_blank" className="tombol tombol-kecil">Cetak penawaran</Link>}
        {tampakNilai && p.tgl_faktur && <Link href={`/cetak/${p.id}?jenis=faktur`} target="_blank" className="tombol tombol-kecil">Cetak faktur</Link>}
      </Kepala>
      <Pesan galat={galat} />

      {kurang.length > 0 && (
        <p className="mb-4 rounded-md border border-lampu-gelap/50 bg-[#fdf0d2] px-4 py-3 text-sm text-[#7a5209]">
          Aset belum cukup untuk dibooking di tanggal ini. {kurang.join("; ")}.
        </p>
      )}

      {tulis && (
        <div className="tanpa-cetak mb-5 flex flex-wrap gap-2">
          {LANGKAH[p.status].map((l) => (
            <form key={l.ke} action={ubahStatus.bind(null, p.id, l.ke)}>
              <button className={`tombol ${l.utama ? "tombol-utama" : ""}`}>{l.teks}</button>
            </form>
          ))}
          {dipesan && !p.tgl_faktur && (
            <form action={terbitkanFaktur.bind(null, p.id)}>
              <button className="tombol tombol-tinta">Terbitkan faktur</button>
            </form>
          )}
        </div>
      )}

      {tampakNilai && <section aria-label="Ringkasan nilai" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total", rupiah(p.total), p.diskon ? `Sesudah diskon ${rupiah(p.diskon)}` : ""],
          ["Sudah dibayar", rupiah(p.dibayar), ""],
          ["Sisa tagihan", rupiah(p.sisa), p.tgl_faktur ? `Faktur ${tanggal(p.tgl_faktur)}` : "Faktur belum terbit"],
          ...(lihatUang ? [["Laba pesanan", rupiah(p.total - totalBiaya), `Biaya langsung ${rupiah(totalBiaya)}`]] : []),
        ].map(([label, n, ket]) => (
          <div key={label} className="kartu p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">{label}</p>
            <p className="mt-1 font-judul text-lg font-bold tabular-nums">{n}</p>
            {ket && <p className="mt-1 text-xs text-tinta-lembut">{ket}</p>}
          </div>
        ))}
      </section>}

      <section className="kartu mb-5 p-4">
        <h2 className="mb-3 text-sm font-bold">Rincian pesanan</h2>
        {bisaUbah ? (
          <FormPesanan
            pesanan={p}
            baris={baris}
            kontak={semua<Kontak>("SELECT * FROM kontak ORDER BY nama")}
            aset={semua<Aset>("SELECT * FROM aset WHERE aktif = 1 ORDER BY kategori, nama, ukuran")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel">
              <thead>
                <tr><th scope="col">Keterangan</th><th scope="col" className="angka">Jumlah</th><th scope="col" className="angka">Hari</th>{tampakNilai && <th scope="col" className="angka">Harga</th>}{tampakNilai && <th scope="col" className="angka">Nilai</th>}</tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={b.id}>
                    <td>{b.deskripsi}</td>
                    <td className="angka">{b.jumlah}</td>
                    <td className="angka">{b.hari}</td>
                    {tampakNilai && <td className="angka">{rupiah(b.harga)}</td>}
                    {tampakNilai && <td className="angka">{rupiah(nilaiBaris(b))}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {p.lokasi && <p className="mt-3 text-sm">Lokasi: {p.lokasi}</p>}
            {p.catatan && <p className="mt-1 text-sm">Catatan: {p.catatan}</p>}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {tampakNilai && <section className="kartu p-4">
          <h2 className="mb-3 text-sm font-bold">Pembayaran masuk</h2>
          {bayar.length === 0 ? (
            <Kosong>{dipesan ? "Belum ada pembayaran." : "Pembayaran dicatat sesudah pesanan dibooking."}</Kosong>
          ) : (
            <table className="tabel mb-3">
              <tbody>
                {bayar.map((b) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap">{tanggal(b.tanggal)}</td>
                    <td>{b.metode}{b.catatan && `, ${b.catatan}`}</td>
                    <td className="angka">{rupiah(b.jumlah)}</td>
                    {tulisUang && (
                      <td className="w-px">
                        <form action={hapusPembayaran.bind(null, b.id)}>
                          <button className="text-xs text-terpal-gelap underline" aria-label={`Hapus pembayaran ${tanggal(b.tanggal)}`}>Hapus</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tulis && dipesan && p.sisa > 0 && (
            <form action={tambahPembayaran.bind(null, p.id)} className="grid grid-cols-2 gap-2 border-t border-garis pt-3">
              <Bidang label="Tanggal" id="bayar_tanggal">
                <input className="isian" id="bayar_tanggal" name="tanggal" type="date" required defaultValue={hari} />
              </Bidang>
              <Bidang label="Jumlah (Rp)" id="bayar_jumlah">
                <input className="isian" id="bayar_jumlah" name="jumlah" inputMode="numeric" required />
              </Bidang>
              <Bidang label="Metode" id="bayar_metode">
                <select className="isian" id="bayar_metode" name="metode">
                  <option value="transfer">Transfer</option>
                  <option value="tunai">Tunai</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </Bidang>
              <Bidang label="Catatan" id="bayar_catatan">
                <input className="isian" id="bayar_catatan" name="catatan" placeholder="DP, pelunasan" maxLength={200} />
              </Bidang>
              <div className="col-span-2"><button className="tombol tombol-tinta">Catat pembayaran</button></div>
            </form>
          )}
        </section>}

        {lihatUang && (
          <section className="kartu p-4">
            <h2 className="mb-3 text-sm font-bold">Biaya langsung</h2>
            {biaya.length === 0 ? (
              <Kosong>Belum ada biaya untuk pesanan ini.</Kosong>
            ) : (
              <table className="tabel mb-3">
                <tbody>
                  {biaya.map((b) => (
                    <tr key={b.id}>
                      <td className="whitespace-nowrap">{tanggal(b.tanggal)}</td>
                      <td>{b.kategori}{b.keterangan && `, ${b.keterangan}`}</td>
                      <td className="angka">{rupiah(b.jumlah)}</td>
                      {tulisUang && (
                        <td className="w-px">
                          <form action={hapusBiaya.bind(null, b.id)}>
                            <button className="text-xs text-terpal-gelap underline" aria-label={`Hapus biaya ${b.kategori}`}>Hapus</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tulisUang && (
              <form action={tambahBiaya} className="grid grid-cols-2 gap-2 border-t border-garis pt-3">
                <input type="hidden" name="pesanan_id" value={p.id} />
                <Bidang label="Tanggal" id="biaya_tanggal">
                  <input className="isian" id="biaya_tanggal" name="tanggal" type="date" required defaultValue={hari} />
                </Bidang>
                <Bidang label="Jumlah (Rp)" id="biaya_jumlah">
                  <input className="isian" id="biaya_jumlah" name="jumlah" inputMode="numeric" required />
                </Bidang>
                <Bidang label="Kategori" id="biaya_kategori">
                  <input className="isian" id="biaya_kategori" name="kategori" required placeholder="Transport, upah kru" maxLength={60} />
                </Bidang>
                <Bidang label="Keterangan" id="biaya_keterangan">
                  <input className="isian" id="biaya_keterangan" name="keterangan" maxLength={300} />
                </Bidang>
                <div className="col-span-2"><button className="tombol tombol-tinta">Catat biaya</button></div>
              </form>
            )}
          </section>
        )}

        <section className="kartu p-4 xl:col-span-2">
          <h2 className="mb-3 text-sm font-bold">Jadwal dan kru</h2>
          {tugas.length === 0 ? (
            <Kosong>Jadwal pasang dan bongkar dibuat otomatis saat pesanan dibooking.</Kosong>
          ) : (
            <ul className="mb-3 grid gap-3 md:grid-cols-2">
              {tugas.map((t) => {
                const butir = bacaChecklist(t.checklist);
                return (
                  <li key={t.id} className="ceruk p-3 text-sm">
                    <p className="font-semibold">
                      {LABEL_TUGAS[t.jenis]}, {tanggal(t.tanggal)} {t.selesai ? <Lencana nilai="selesai" /> : null}
                    </p>
                    <p className="text-xs text-tinta-lembut">
                      Kru: {t.kru || "belum ditugaskan"}. Checklist {butir.filter((b) => b.beres).length} dari {butir.length}.
                    </p>
                    {tulisJadwal && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold">Ubah tugas</summary>
                        <form action={simpanTugas.bind(null, p.id)} className="mt-2 grid grid-cols-2 gap-2">
                          <input type="hidden" name="id" value={t.id} />
                          <Bidang label="Jenis" id={`jenis-${t.id}`}>
                            <select className="isian" id={`jenis-${t.id}`} name="jenis" defaultValue={t.jenis}>
                              {Object.entries(LABEL_TUGAS).map(([v, teks]) => <option key={v} value={v}>{teks}</option>)}
                            </select>
                          </Bidang>
                          <Bidang label="Tanggal" id={`tgl-${t.id}`}>
                            <input className="isian" id={`tgl-${t.id}`} name="tanggal" type="date" required defaultValue={t.tanggal} />
                          </Bidang>
                          <Bidang label="Kru (pisahkan dengan koma)" id={`kru-${t.id}`} className="col-span-2">
                            <input className="isian" id={`kru-${t.id}`} name="kru" maxLength={200} defaultValue={t.kru} />
                          </Bidang>
                          <Bidang label="Checklist, satu butir per baris" id={`butir-${t.id}`} className="col-span-2">
                            <textarea className="isian" id={`butir-${t.id}`} name="butir" rows={5} defaultValue={butir.map((b) => b.teks).join("\n")} />
                          </Bidang>
                          <div className="col-span-2 flex gap-2">
                            <button className="tombol tombol-kecil tombol-tinta">Simpan</button>
                            <button formAction={hapusTugas.bind(null, t.id)} formNoValidate className="tombol tombol-kecil">Hapus tugas</button>
                          </div>
                        </form>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {tulisJadwal && p.status !== "batal" && (
            <form action={simpanTugas.bind(null, p.id)} className="flex flex-wrap items-end gap-2 border-t border-garis pt-3">
              <Bidang label="Tugas baru" id="tugas_jenis">
                <select className="isian" id="tugas_jenis" name="jenis" defaultValue="survei">
                  {Object.entries(LABEL_TUGAS).map(([v, teks]) => <option key={v} value={v}>{teks}</option>)}
                </select>
              </Bidang>
              <Bidang label="Tanggal" id="tugas_tanggal">
                <input className="isian" id="tugas_tanggal" name="tanggal" type="date" required defaultValue={p.mulai} />
              </Bidang>
              <Bidang label="Kru" id="tugas_kru" className="min-w-48 flex-1">
                <input className="isian" id="tugas_kru" name="kru" maxLength={200} />
              </Bidang>
              <button className="tombol tombol-tinta">Tambah tugas</button>
            </form>
          )}
        </section>

        {tulis && (
          <section className="kartu p-4 xl:col-span-2">
            <h2 className="mb-1 text-sm font-bold">Pesan ulang</h2>
            <p className="mb-3 text-xs text-tinta-lembut">Menyalin baris dan harga pesanan ini menjadi penawaran baru di tanggal lain.</p>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <form action={duplikatPesanan.bind(null, p.id)} className="flex flex-wrap items-end gap-2">
                <Bidang label="Tanggal pasang baru" id="dup_mulai">
                  <input className="isian" id="dup_mulai" name="mulai" type="date" required />
                </Bidang>
                <button className="tombol">Salin jadi penawaran</button>
              </form>
              {(p.status === "penawaran" || p.status === "batal") && (
                <form action={hapusPesanan.bind(null, p.id)}>
                  <button className="tombol text-terpal-gelap">Hapus pesanan</button>
                </form>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
