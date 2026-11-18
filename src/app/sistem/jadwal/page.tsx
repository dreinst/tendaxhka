import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/komponen/panel";
import { Bidang, Kepala, Kosong, Lencana, nilai, Pesan, type Cari } from "@/komponen/ui";
import { centangTugas } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import type { Tugas } from "@/lib/data";
import { semua } from "@/lib/db";
import { hariIni, LABEL_TUGAS, tanggal } from "@/lib/format";
import { bacaChecklist, boleh, tambahHari } from "@/lib/hitung";

export const metadata: Metadata = { title: "Jadwal kru" };

export default async function Jadwal({ searchParams }: { searchParams: Cari }) {
  const u = await wajib("jadwal.lihat");
  const centang = boleh(u.peran, "jadwal.centang");
  const lihatPesanan = boleh(u.peran, "pesanan.lihat");
  const hari = hariIni();
  // Tugas yang belum selesai tetap tampil walau tanggalnya sudah lewat. Yang selesai tampil 7 hari terakhir.
  const tugas = await semua<Tugas>(
    `SELECT t.*, p.nomor, p.acara, p.lokasi FROM tugas t JOIN pesanan p ON p.id = t.pesanan_id
     WHERE p.status <> 'batal' AND ((t.selesai = 0 AND t.tanggal <= ?) OR (t.selesai = 1 AND t.tanggal >= ?))
     ORDER BY t.selesai, t.tanggal, t.id`,
    tambahHari(hari, 30),
    tambahHari(hari, -7),
  );
  return (
    <>
      <Kepala judul="Jadwal kru" ket="Tugas lapangan 30 hari ke depan dengan checklist per tugas." />
      <Pesan galat={nilai((await searchParams).galat)} />
      {tugas.length === 0 ? (
        <div className="kartu"><Kosong>Belum ada tugas. Jadwal pasang dan bongkar muncul saat pesanan dibooking.</Kosong></div>
      ) : (
        <div className="kartu overflow-hidden">
          {/* Daftar ringkas. Checklist dan catatan tiap tugas ada di panelnya, jadi kru cukup satu ketukan di tombol
              Checklist untuk mulai mencentang. */}
          <table className="tabel tabel-susun md:[&_td]:align-middle">
            <thead>
              <tr>
                <th scope="col">Tugas</th>
                <th scope="col">Tanggal</th>
                <th scope="col">Lokasi dan kru</th>
                <th scope="col">Checklist</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              {tugas.map((t) => {
                const butir = bacaChecklist(t.checklist);
                const beres = butir.filter((b) => b.beres).length;
                const lewat = !t.selesai && t.tanggal < hari;
                const nama = `${LABEL_TUGAS[t.jenis]}: ${t.acara}`;
                return (
                  <tr key={t.id} id={`tugas-${t.id}`} className={`scroll-mt-20 ${t.selesai ? "text-tinta-lembut" : ""}`}>
                    <th scope="row">
                      <span className="font-semibold">{nama}</span>
                      <span className="block text-xs font-normal text-tinta-lembut">
                        {lihatPesanan ? (
                          <Link href={`/sistem/pesanan/${t.pesanan_id}`} className="sentuh whitespace-nowrap underline">{t.nomor}</Link>
                        ) : (
                          t.nomor
                        )}
                        <span className={`md:hidden ${lewat ? "font-semibold text-terpal-gelap" : ""}`}>, {tanggal(t.tanggal)}</span>
                      </span>
                    </th>
                    <td className={`susun-sembunyi whitespace-nowrap ${lewat ? "font-semibold text-terpal-gelap" : ""}`}>{tanggal(t.tanggal)}</td>
                    <td className="text-sm">
                      {t.lokasi || "Lokasi belum diisi"}
                      <span className="block text-xs text-tinta-lembut">Kru: {t.kru || "belum ditugaskan"}</span>
                    </td>
                    <td className="whitespace-nowrap text-sm tabular-nums">
                      <span className="md:hidden">Checklist </span>
                      {beres} dari {butir.length}
                    </td>
                    <td className="susun-kanan">
                      {t.selesai ? <Lencana nilai="selesai" /> : lewat ? <Lencana nilai="berjalan" teks="Terlambat" /> : <Lencana nilai="penawaran" teks="Belum selesai" />}
                    </td>
                    <td className="susun-kanan w-px align-middle">
                      <Panel
                        tombol={centang ? "Checklist" : "Lihat"}
                        labelTombol={`${centang ? "Checklist" : "Lihat checklist"} ${nama}, ${tanggal(t.tanggal)}`}
                        judul={nama}
                        ket={`${t.nomor}, ${tanggal(t.tanggal)}. ${t.lokasi || "Lokasi belum diisi"}. Kru: ${t.kru || "belum ditugaskan"}.`}
                        kunci={`tugas-${t.id}`}
                        kelasTombol={`tombol min-h-11 whitespace-nowrap ${centang && !t.selesai ? "tombol-tinta" : ""}`}
                      >
                        <form action={centangTugas.bind(null, t.id)}>
                          {/* Tiap baris checklist setinggi 44 px dan seluruh barisnya bisa disentuh, karena kru
                              mencentang dari HP di lapangan. */}
                          <fieldset disabled={!centang} className="min-w-0">
                            <legend className="sr-only">Checklist {nama}</legend>
                            {butir.length === 0 && <p className="py-2 text-sm text-tinta-lembut">Tugas ini tidak punya butir checklist.</p>}
                            {butir.map((b, i) => (
                              <label key={i} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-[#ede6d9] py-1 text-sm">
                                <input type="checkbox" name="butir" value={i} defaultChecked={b.beres} className="size-5 shrink-0 accent-tinta" />
                                <span>{b.teks}</span>
                              </label>
                            ))}
                            <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-3 py-1 text-sm font-semibold">
                              <input type="checkbox" name="selesai" defaultChecked={!!t.selesai} className="size-5 shrink-0 accent-tinta" /> Tugas selesai
                            </label>
                            <Bidang label="Catatan lapangan" id={`catatan-${t.id}`} className="mt-3">
                              <input className="isian" id={`catatan-${t.id}`} name="catatan" maxLength={500} defaultValue={t.catatan} placeholder="Barang rusak, kendala di lokasi" />
                            </Bidang>
                            {centang && <button className="tombol tombol-tinta mt-4 min-h-11 w-full px-6 sm:w-auto">Simpan</button>}
                          </fieldset>
                        </form>
                      </Panel>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
