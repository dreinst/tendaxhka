import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormPesanan } from "@/komponen/formulir";
import { Panel } from "@/komponen/panel";
import { Bidang, JudulKartu, Kepala, Lencana, nilai, Pesan, type Cari } from "@/komponen/ui";
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
import { ambilPesanan, barisPesanan, kekurangan, lihatNilai, pengaturan, type Aset, type Biaya, type Kontak, type Tugas } from "@/lib/data";
import { semua } from "@/lib/db";
import { hariIni, LABEL_TUGAS, rupiah, tanggal } from "@/lib/format";
import { bacaChecklist, bacaJarakPenawaran, batasPasang, boleh, nilaiBaris } from "@/lib/hitung";

export const metadata: Metadata = { title: "Pesanan" };

const LANGKAH: Record<string, { ke: string; teks: string; utama?: boolean }[]> = {
  penawaran: [{ ke: "booking", teks: "Konfirmasi booking", utama: true }, { ke: "batal", teks: "Batalkan" }],
  booking: [{ ke: "berjalan", teks: "Mulai pelaksanaan", utama: true }, { ke: "penawaran", teks: "Kembalikan ke penawaran" }, { ke: "batal", teks: "Batalkan" }],
  berjalan: [{ ke: "selesai", teks: "Tandai selesai", utama: true }],
  selesai: [],
  batal: [{ ke: "penawaran", teks: "Buka lagi sebagai penawaran" }],
};

const OPSI_TUGAS = Object.entries(LABEL_TUGAS).map(([v, teks]) => (
  <option key={v} value={v}>
    {teks}
  </option>
));

export default async function DetailPesanan({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Cari }) {
  const u = await wajib("pesanan.lihat");
  const p = await ambilPesanan(Number((await params).id) || 0);
  if (!p) notFound();
  const galat = nilai((await searchParams).galat);
  const tulis = boleh(u.peran, "pesanan.tulis");
  const lihatUang = boleh(u.peran, "keuangan.lihat");
  const tulisUang = boleh(u.peran, "keuangan.tulis");
  const tulisJadwal = boleh(u.peran, "jadwal.tulis");
  const bisaUbah = tulis && p.status !== "selesai" && p.status !== "batal";
  const dipesan = p.status !== "penawaran" && p.status !== "batal";
  const bisaHapus = tulis && (p.status === "penawaran" || p.status === "batal");

  // Kueri di bawah tidak saling bergantung, jadi dijalankan bersamaan. Pembayaran hanya diambil kalau akun ini
  // boleh melihat nilai pesanan.
  const nilaiTampak = lihatNilai(u.peran);
  const [tampakNilai, baris, kurang, bayar, biaya, tugas, pilihan, atur] = await Promise.all([
    nilaiTampak,
    barisPesanan(p.id),
    p.status === "penawaran" ? kekurangan(p.id) : [],
    nilaiTampak.then((tampak) =>
      tampak
        ? semua<{ id: number; tanggal: string; jumlah: number; metode: string; catatan: string }>(
            "SELECT * FROM pembayaran WHERE pesanan_id = ? ORDER BY tanggal, id",
            p.id,
          )
        : [],
    ),
    lihatUang ? semua<Biaya>("SELECT *, NULL AS nomor FROM biaya WHERE pesanan_id = ? ORDER BY tanggal, id", p.id) : [],
    semua<Tugas>("SELECT *, '' AS nomor, '' AS acara, '' AS lokasi FROM tugas WHERE pesanan_id = ? ORDER BY tanggal, id", p.id),
    // Daftar pilihan untuk formulir ubah pesanan.
    bisaUbah
      ? Promise.all([semua<Kontak>("SELECT * FROM kontak ORDER BY nama"), semua<Aset>("SELECT * FROM aset WHERE aktif = 1 ORDER BY kategori, nama, ukuran")])
      : null,
    pengaturan(),
  ]);
  const totalBiaya = biaya.reduce((s, b) => s + b.jumlah, 0);
  const hari = hariIni();
  const jarak = bacaJarakPenawaran(atur.jarak_penawaran_hari);
  const batasBaru = jarak > 0 ? batasPasang(hari, jarak) : undefined;
  // Penawaran tanpa pembayaran cukup diberi satu baris keterangan. Kartu pembayaran dan biaya baru berdampingan
  // di layar lebar kalau keduanya tampil penuh.
  const bayarRingkas = !dipesan && bayar.length === 0;
  // Penawaran (atau pesanan batal) yang belum pernah dibayar: ringkasan nilai cukup total penawarannya.
  const penawaranSaja = !dipesan && p.dibayar === 0;
  const berdampingan = tampakNilai && !bayarRingkas && lihatUang;
  const lebarPenuh = berdampingan ? "" : "xl:col-span-2";
  const kolomNilai = tampakNilai ? 2 : 0;

  return (
    <>
      <Kepala judul={`${p.nomor} · ${p.acara}`} ket={`${p.kontak}${p.perusahaan && `, ${p.perusahaan}`}. Pasang ${tanggal(p.mulai)}, bongkar ${tanggal(p.selesai)}.`}>
        <Lencana nilai={p.status} />
        {/* Sesudah faktur terbit, faktur yang paling sering dicetak, jadi tombolnya didahulukan. */}
        {tampakNilai && p.tgl_faktur && <Link href={`/cetak/${p.id}?jenis=faktur`} target="_blank" className="tombol tombol-kecil">Cetak faktur</Link>}
        {tampakNilai && <Link href={`/cetak/${p.id}?jenis=penawaran`} target="_blank" className="tombol tombol-kecil">Cetak penawaran</Link>}
      </Kepala>
      <Pesan galat={galat} />

      {kurang.length > 0 && (
        <p className="mb-4 rounded-md border border-lampu-gelap/50 bg-[#fdf0d2] px-4 py-3 text-sm text-[#7a5209]">
          Aset belum cukup untuk dibooking di tanggal ini. {kurang.join("; ")}.
        </p>
      )}

      {tulis && (
        <div className="tanpa-cetak mb-5 flex flex-wrap items-center gap-2">
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
          <Panel tombol="Pesan ulang" judul="Pesan ulang" ket="Menyalin baris dan harga pesanan ini menjadi penawaran baru di tanggal lain.">
            <form action={duplikatPesanan.bind(null, p.id)} className="space-y-4">
              <Bidang label="Tanggal pasang baru" id="dup_mulai">
                <input className="isian" id="dup_mulai" name="mulai" type="date" required min={batasBaru} aria-describedby={batasBaru ? "dup_mulai_ket" : undefined} />
                {batasBaru && (
                  <p id="dup_mulai_ket" className="mt-1 text-xs text-tinta-lembut">
                    Tanggal pasang paling cepat {tanggal(batasBaru)}, {jarak} hari dari tanggal penawaran.
                  </p>
                )}
              </Bidang>
              <button className="tombol tombol-utama">Salin jadi penawaran</button>
            </form>
          </Panel>
          {/* Hapus ditaruh di ujung kanan dan selalu lewat konfirmasi, supaya tidak tertekan saat mengincar tombol lain. */}
          {bisaHapus && (
            <div className="sm:ml-auto">
              <Panel
                tombol="Hapus pesanan"
                kelasTombol="tombol text-terpal-gelap"
                judul={`Hapus ${p.nomor}?`}
                ket={`${p.acara}, ${p.kontak}. Baris barang dan jadwalnya ikut terhapus dan tidak bisa dikembalikan. Biaya yang sudah dicatat tetap tersimpan, tanpa nomor pesanan.`}
              >
                <form action={hapusPesanan.bind(null, p.id)}>
                  <button className="tombol tombol-utama">Hapus pesanan</button>
                </form>
              </Panel>
            </div>
          )}
        </div>
      )}

      {tampakNilai &&
        (penawaranSaja ? (
          // Belum ada pesanan, jadi belum ada pembayaran, sisa tagihan, atau laba. Cukup nilai penawarannya, plus
          // biaya langsung yang sudah keluar (misalnya survei) kalau ada.
          <section aria-label="Ringkasan nilai" className="kartu mb-5 flex min-w-0 flex-wrap items-baseline gap-x-8 gap-y-2 px-4 py-3">
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">Total penawaran</span>
              <span className="font-judul text-lg font-bold tabular-nums">{rupiah(p.total)}</span>
              {p.diskon > 0 && <span className="text-xs text-tinta-lembut">Sesudah diskon {rupiah(p.diskon)}</span>}
            </p>
            {lihatUang && totalBiaya > 0 && (
              <p className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">Biaya langsung</span>
                <span className="font-judul text-lg font-bold tabular-nums">{rupiah(totalBiaya)}</span>
              </p>
            )}
          </section>
        ) : (
          <section aria-label="Ringkasan nilai" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Total", rupiah(p.total), p.diskon ? `Sesudah diskon ${rupiah(p.diskon)}` : ""],
              ["Sudah dibayar", rupiah(p.dibayar), ""],
              ["Sisa tagihan", rupiah(p.sisa), p.tgl_faktur ? `Faktur ${tanggal(p.tgl_faktur)}` : "Faktur belum terbit"],
              ...(lihatUang ? [["Laba pesanan", rupiah(p.total - totalBiaya), `Biaya langsung ${rupiah(totalBiaya)}`]] : []),
            ].map(([label, n, ket]) => (
              <div key={label} className="kartu min-w-0 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">{label}</p>
                <p className="mt-1 font-judul text-lg font-bold tabular-nums">{n}</p>
                {ket && <p className="mt-1 text-xs text-tinta-lembut">{ket}</p>}
              </div>
            ))}
          </section>
        ))}

      {/* grid-cols-1 (minmax(0, 1fr)) dan min-w-0 menjaga isi kartu tidak melebarkan halaman di HP. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="kartu min-w-0 p-4 xl:col-span-2">
          <JudulKartu judul="Rincian pesanan">
            {pilihan && (
              <Panel tombol="Ubah rincian" judul={`Ubah rincian ${p.nomor}`} lebar="lebar">
                <FormPesanan pesanan={p} baris={baris} kontak={pilihan[0]} aset={pilihan[1]} hari={hari} jarak={jarak} />
              </Panel>
            )}
          </JudulKartu>
          {baris.length === 0 ? (
            <p className="px-3 text-sm text-tinta-lembut">Belum ada barang atau jasa di pesanan ini.</p>
          ) : (
            <table className="tabel tabel-susun">
              <thead>
                <tr>
                  <th scope="col">Keterangan</th>
                  <th scope="col" className="angka">Jumlah</th>
                  <th scope="col" className="angka">Hari</th>
                  {tampakNilai && <th scope="col" className="angka">Harga</th>}
                  {tampakNilai && <th scope="col" className="angka">Nilai</th>}
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {b.deskripsi}
                      <span className="block text-xs text-tinta-lembut md:hidden">
                        {b.jumlah} × {b.hari} hari{tampakNilai && ` × ${rupiah(b.harga)}`}
                      </span>
                    </td>
                    <td className="angka susun-sembunyi">{b.jumlah}</td>
                    <td className="angka susun-sembunyi">{b.hari}</td>
                    {tampakNilai && <td className="angka susun-sembunyi">{rupiah(b.harga)}</td>}
                    {tampakNilai && <td className="angka susun-kanan">{rupiah(nilaiBaris(b))}</td>}
                  </tr>
                ))}
              </tbody>
              {tampakNilai && (
                <tfoot>
                  {p.diskon > 0 && (
                    <>
                      <tr>
                        <th scope="row" colSpan={2 + kolomNilai} className="md:text-right">Subtotal</th>
                        <td className="angka susun-kanan">{rupiah(p.subtotal)}</td>
                      </tr>
                      <tr>
                        <th scope="row" colSpan={2 + kolomNilai} className="md:text-right">Diskon</th>
                        <td className="angka susun-kanan">{rupiah(-p.diskon)}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <th scope="row" colSpan={2 + kolomNilai} className="md:text-right">Total</th>
                    <td className="angka susun-kanan font-bold">{rupiah(p.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
          {(p.lokasi || p.catatan) && (
            <dl className="mt-3 grid gap-x-4 gap-y-1 border-t border-garis px-3 pt-3 text-sm sm:grid-cols-[5rem_minmax(0,1fr)]">
              {p.lokasi && (
                <>
                  <dt className="text-tinta-lembut">Lokasi</dt>
                  <dd>{p.lokasi}</dd>
                </>
              )}
              {p.catatan && (
                <>
                  <dt className="text-tinta-lembut">Catatan</dt>
                  <dd>{p.catatan}</dd>
                </>
              )}
            </dl>
          )}
        </section>

        {tampakNilai &&
          (bayarRingkas ? (
            <section className={`kartu flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 ${lebarPenuh}`}>
              <h2 className="text-sm font-bold">Pembayaran masuk</h2>
              <p className="text-sm text-tinta-lembut">Dicatat sesudah pesanan dibooking.</p>
            </section>
          ) : (
            <section className={`kartu min-w-0 p-4 ${lebarPenuh}`}>
              <JudulKartu judul="Pembayaran masuk">
                {tulis && dipesan && p.sisa > 0 && (
                  <Panel tombol="Catat pembayaran" judul="Catat pembayaran" ket={`Sisa tagihan ${rupiah(p.sisa)}.`}>
                    <form action={tambahPembayaran.bind(null, p.id)} className="grid grid-cols-2 gap-3">
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
                      <div className="col-span-2 pt-1">
                        <button className="tombol tombol-utama">Catat pembayaran</button>
                      </div>
                    </form>
                  </Panel>
                )}
              </JudulKartu>
              {bayar.length === 0 ? (
                <p className="px-3 text-sm text-tinta-lembut">Belum ada pembayaran.</p>
              ) : (
                <table className="tabel tabel-susun md:[&_td]:align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Tanggal</th>
                      <th scope="col">Metode</th>
                      <th scope="col" className="angka">Jumlah</th>
                      {tulisUang && <th scope="col"><span className="sr-only">Aksi</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {bayar.map((b) => (
                      <tr key={b.id}>
                        <td className="whitespace-nowrap">{tanggal(b.tanggal)}</td>
                        <td className="text-tinta-lembut md:text-tinta">{b.metode}{b.catatan && `, ${b.catatan}`}</td>
                        <td className="angka susun-kanan font-semibold md:font-normal">{rupiah(b.jumlah)}</td>
                        {tulisUang && (
                          <td className="susun-kanan w-px py-0 align-middle">
                            <form action={hapusPembayaran.bind(null, b.id)}>
                              <button className="tombol-teks" aria-label={`Hapus pembayaran ${tanggal(b.tanggal)}`}>Hapus</button>
                            </form>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}

        {lihatUang && (
          <section className={`kartu min-w-0 p-4 ${lebarPenuh}`}>
            <JudulKartu judul="Biaya langsung">
              {tulisUang && (
                <Panel tombol="Catat biaya" judul="Catat biaya langsung" ket={`Biaya yang hanya dipakai untuk ${p.nomor}, misalnya transport dan upah kru.`}>
                  <form action={tambahBiaya} className="grid grid-cols-2 gap-3">
                    <input type="hidden" name="pesanan_id" value={p.id} />
                    <Bidang label="Tanggal" id="biaya_tanggal">
                      <input className="isian" id="biaya_tanggal" name="tanggal" type="date" required defaultValue={hari} />
                    </Bidang>
                    <Bidang label="Jumlah (Rp)" id="biaya_jumlah">
                      <input className="isian" id="biaya_jumlah" name="jumlah" inputMode="numeric" required />
                    </Bidang>
                    <Bidang label="Kategori" id="biaya_kategori" className="col-span-2">
                      <input className="isian" id="biaya_kategori" name="kategori" required placeholder="Transport, upah kru" maxLength={60} />
                    </Bidang>
                    <Bidang label="Keterangan" id="biaya_keterangan" className="col-span-2">
                      <input className="isian" id="biaya_keterangan" name="keterangan" maxLength={300} />
                    </Bidang>
                    <div className="col-span-2 pt-1">
                      <button className="tombol tombol-utama">Catat biaya</button>
                    </div>
                  </form>
                </Panel>
              )}
            </JudulKartu>
            {biaya.length === 0 ? (
              <p className="px-3 text-sm text-tinta-lembut">Belum ada biaya untuk pesanan ini.</p>
            ) : (
              <table className="tabel tabel-susun md:[&_td]:align-middle">
                <thead>
                  <tr>
                    <th scope="col">Tanggal</th>
                    <th scope="col">Kategori</th>
                    <th scope="col" className="angka">Jumlah</th>
                    {tulisUang && <th scope="col"><span className="sr-only">Aksi</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {biaya.map((b) => (
                    <tr key={b.id}>
                      <td className="whitespace-nowrap">{tanggal(b.tanggal)}</td>
                      <td className="text-tinta-lembut md:text-tinta">{b.kategori}{b.keterangan && `, ${b.keterangan}`}</td>
                      <td className="angka susun-kanan font-semibold md:font-normal">{rupiah(b.jumlah)}</td>
                      {tulisUang && (
                        <td className="susun-kanan w-px py-0 align-middle">
                          <form action={hapusBiaya.bind(null, b.id)}>
                            <button className="tombol-teks" aria-label={`Hapus biaya ${b.kategori}`}>Hapus</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        <section className="kartu min-w-0 p-4 xl:col-span-2">
          <JudulKartu judul="Jadwal dan kru">
            {tulisJadwal && p.status !== "batal" && (
              <Panel tombol="Tambah tugas" judul="Tambah tugas" ket="Survei, pasang, bongkar, atau tugas lain untuk pesanan ini.">
                <form action={simpanTugas.bind(null, p.id)} className="grid grid-cols-2 gap-3">
                  <Bidang label="Jenis tugas" id="tugas_jenis">
                    <select className="isian" id="tugas_jenis" name="jenis" defaultValue="survei">
                      {OPSI_TUGAS}
                    </select>
                  </Bidang>
                  <Bidang label="Tanggal" id="tugas_tanggal">
                    <input className="isian" id="tugas_tanggal" name="tanggal" type="date" required defaultValue={p.mulai} />
                  </Bidang>
                  <Bidang label="Kru (pisahkan dengan koma)" id="tugas_kru" className="col-span-2">
                    <input className="isian" id="tugas_kru" name="kru" maxLength={200} />
                  </Bidang>
                  <div className="col-span-2 pt-1">
                    <button className="tombol tombol-utama">Tambah tugas</button>
                  </div>
                </form>
              </Panel>
            )}
          </JudulKartu>
          {tugas.length === 0 ? (
            <p className="px-3 text-sm text-tinta-lembut">Jadwal pasang dan bongkar dibuat otomatis saat pesanan dibooking.</p>
          ) : (
            <table className="tabel tabel-susun md:[&_td]:align-middle">
              <thead>
                <tr>
                  <th scope="col">Tugas</th>
                  <th scope="col">Kru</th>
                  <th scope="col">Checklist</th>
                  <th scope="col">Status</th>
                  {tulisJadwal && <th scope="col"><span className="sr-only">Aksi</span></th>}
                </tr>
              </thead>
              <tbody>
                {tugas.map((t) => {
                  const butir = bacaChecklist(t.checklist);
                  const beres = butir.filter((b) => b.beres).length;
                  return (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap font-semibold">
                        {LABEL_TUGAS[t.jenis]}, {tanggal(t.tanggal)}
                      </td>
                      <td className="text-tinta-lembut md:text-tinta">{t.kru || "Kru belum ditugaskan"}</td>
                      <td className="whitespace-nowrap text-tinta-lembut md:text-tinta">
                        <span className="md:hidden">Checklist </span>
                        {beres} dari {butir.length}
                      </td>
                      <td className="susun-kanan">
                        {t.selesai ? <Lencana nilai="selesai" /> : <Lencana nilai="penawaran" teks="Belum selesai" />}
                      </td>
                      {tulisJadwal && (
                        <td className="susun-kanan w-px py-1 align-middle">
                          <Panel
                            tombol="Ubah"
                            labelTombol={`Ubah tugas ${LABEL_TUGAS[t.jenis]} ${tanggal(t.tanggal)}`}
                            judul={`Ubah tugas ${LABEL_TUGAS[t.jenis].toLowerCase()}, ${tanggal(t.tanggal)}`}
                            kelasTombol="tombol tombol-kecil"
                          >
                            <form action={simpanTugas.bind(null, p.id)} className="grid grid-cols-2 gap-3">
                              <input type="hidden" name="id" value={t.id} />
                              <Bidang label="Jenis" id={`jenis-${t.id}`}>
                                <select className="isian" id={`jenis-${t.id}`} name="jenis" defaultValue={t.jenis}>
                                  {OPSI_TUGAS}
                                </select>
                              </Bidang>
                              <Bidang label="Tanggal" id={`tgl-${t.id}`}>
                                <input className="isian" id={`tgl-${t.id}`} name="tanggal" type="date" required defaultValue={t.tanggal} />
                              </Bidang>
                              <Bidang label="Kru (pisahkan dengan koma)" id={`kru-${t.id}`} className="col-span-2">
                                <input className="isian" id={`kru-${t.id}`} name="kru" maxLength={200} defaultValue={t.kru} />
                              </Bidang>
                              <Bidang label="Checklist, satu butir per baris" id={`butir-${t.id}`} className="col-span-2">
                                <textarea className="isian" id={`butir-${t.id}`} name="butir" rows={6} defaultValue={butir.map((b) => b.teks).join("\n")} />
                              </Bidang>
                              <div className="col-span-2 flex flex-wrap justify-between gap-2 pt-1">
                                <button className="tombol tombol-utama">Simpan</button>
                                <button formAction={hapusTugas.bind(null, t.id)} formNoValidate className="tombol text-terpal-gelap">
                                  Hapus tugas
                                </button>
                              </div>
                            </form>
                          </Panel>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
