import type { Metadata } from "next";
import Link from "next/link";
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
  const tugas = semua<Tugas>(
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
        <ul className="grid gap-4 lg:grid-cols-2">
          {tugas.map((t) => {
            const butir = bacaChecklist(t.checklist);
            return (
              <li key={t.id} id={`tugas-${t.id}`} className={`kartu scroll-mt-4 p-4 ${t.selesai ? "opacity-70" : ""}`}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold">{LABEL_TUGAS[t.jenis]}: {t.acara}</h2>
                    <p className="text-xs text-tinta-lembut">
                      {lihatPesanan ? <Link href={`/sistem/pesanan/${t.pesanan_id}`} className="underline">{t.nomor}</Link> : t.nomor}
                      {" · "}{t.lokasi || "Lokasi belum diisi"}
                    </p>
                    <p className="text-xs">Kru: {t.kru || "belum ditugaskan"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xs font-bold ${!t.selesai && t.tanggal < hari ? "text-terpal-gelap" : ""}`}>{tanggal(t.tanggal)}</p>
                    {t.selesai ? <Lencana nilai="selesai" /> : t.tanggal < hari ? <Lencana nilai="berjalan" teks="Terlambat" /> : null}
                  </div>
                </div>
                <form action={centangTugas.bind(null, t.id)}>
                  <fieldset disabled={!centang} className="space-y-1.5">
                    <legend className="sr-only">Checklist {LABEL_TUGAS[t.jenis]} {t.acara}</legend>
                    {butir.map((b, i) => (
                      <label key={i} className="flex items-start gap-2 text-sm">
                        <input type="checkbox" name="butir" value={i} defaultChecked={b.beres} className="mt-0.5 size-4 shrink-0" />
                        <span>{b.teks}</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2 border-t border-garis pt-2 text-sm font-semibold">
                      <input type="checkbox" name="selesai" defaultChecked={!!t.selesai} className="size-4" /> Tugas selesai
                    </label>
                    <Bidang label="Catatan lapangan" id={`catatan-${t.id}`}>
                      <input className="isian" id={`catatan-${t.id}`} name="catatan" maxLength={500} defaultValue={t.catatan} placeholder="Barang rusak, kendala di lokasi" />
                    </Bidang>
                    {centang && <button className="tombol tombol-kecil tombol-tinta">Simpan</button>}
                  </fieldset>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
