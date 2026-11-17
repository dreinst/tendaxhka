import Link from "next/link";
import { Kepala, Kosong, Lencana, nilai, Pesan, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { daftarPesanan, labaBulan, lihatNilai, utilisasiBulan, type Kontak, type Tugas } from "@/lib/data";
import { satu, semua } from "@/lib/db";
import { hariIni, LABEL_TAHAP, LABEL_TUGAS, namaBulan, persen, rupiah, tanggal } from "@/lib/format";
import { boleh, geserBulan, tambahHari } from "@/lib/hitung";

function Angka({ label, nilai: n, ket }: { label: string; nilai: string; ket?: string }) {
  return (
    <div className="kartu p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-tinta-lembut">{label}</p>
      <p className="mt-1 font-judul text-lg font-bold tabular-nums md:text-xl">{n}</p>
      {ket && <p className="mt-1 text-xs text-tinta-lembut">{ket}</p>}
    </div>
  );
}

export default async function Dasbor({ searchParams }: { searchParams: Cari }) {
  const u = await wajib();
  const galat = nilai((await searchParams).galat);
  const hari = hariIni();
  const bulan = hari.slice(0, 7);
  const lihatUang = boleh(u.peran, "keuangan.lihat");
  const lihatKontak = boleh(u.peran, "kontak.lihat");
  const lihatPesanan = boleh(u.peran, "pesanan.lihat");
  const tampakNilai = lihatNilai(u.peran);

  const laba = lihatUang ? labaBulan(bulan) : null;
  const tren = lihatUang ? [-5, -4, -3, -2, -1, 0].map((n) => labaBulan(geserBulan(bulan, n))) : [];
  const puncak = Math.max(1, ...tren.map((t) => Math.max(t.pendapatan, t.biayaLangsung + t.biayaOperasional)));
  const util = utilisasiBulan(bulan);

  const aktif = lihatPesanan ? daftarPesanan("WHERE p.status IN ('booking', 'berjalan', 'selesai')") : [];
  const piutang = aktif.reduce((s, p) => s + Math.max(0, p.sisa), 0);
  const terbuka = lihatPesanan ? daftarPesanan("WHERE p.status = 'penawaran'") : [];

  const tahap = lihatKontak ? semua<{ tahap: string; n: number }>("SELECT tahap, COUNT(*) AS n FROM kontak GROUP BY tahap") : [];
  const hitung = (t: string) => tahap.find((x) => x.tahap === t)?.n ?? 0;
  const putus = hitung("menang") + hitung("kalah");
  const berulang = lihatKontak
    ? satu<{ n: number }>(
        `SELECT COUNT(*) AS n FROM (SELECT kontak_id FROM pesanan WHERE status IN ('booking', 'berjalan', 'selesai')
         GROUP BY kontak_id HAVING COUNT(*) > 1)`,
      )!.n
    : 0;
  const tindak = lihatKontak
    ? semua<Kontak>("SELECT * FROM kontak WHERE tindak_lanjut <= ? AND tahap NOT IN ('menang', 'kalah') ORDER BY tindak_lanjut LIMIT 8", hari)
    : [];
  const jadwal = semua<Tugas>(
    `SELECT t.*, p.nomor, p.acara, p.lokasi FROM tugas t JOIN pesanan p ON p.id = t.pesanan_id
     WHERE t.selesai = 0 AND p.status <> 'batal' AND t.tanggal <= ? ORDER BY t.tanggal LIMIT 10`,
    tambahHari(hari, 7),
  );

  return (
    <>
      <Kepala judul="Dasbor" ket={`${namaBulan(bulan)}. Halo, ${u.nama}.`} />
      <Pesan galat={galat} />

      {laba && (
        <section aria-label="Keuangan bulan ini" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Angka label="Pendapatan" nilai={rupiah(laba.pendapatan)} ket={laba.dikunci ? "Periode sudah ditutup" : "Berjalan, belum ditutup"} />
          <Angka label="Biaya" nilai={rupiah(laba.biayaLangsung + laba.biayaOperasional)} ket={`Langsung ${rupiah(laba.biayaLangsung)}`} />
          <Angka label="Nett profit" nilai={rupiah(laba.labaBersih)} ket={`Cadangan ${rupiah(laba.cadangan)}, pajak ${rupiah(laba.pajak)}`} />
          <Angka label="Bagian Tenda Indonesia" nilai={rupiah(laba.bagianTenda)} ket={`HKA Management ${rupiah(laba.bagianHka)}`} />
        </section>
      )}

      <section aria-label="Operasional" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Angka label="Utilisasi aset" nilai={persen(util.rata)} ket="Unit-hari tersewa bulan ini" />
        {lihatPesanan && tampakNilai && <Angka label="Piutang" nilai={rupiah(piutang)} ket={`${aktif.filter((p) => p.sisa > 0).length} pesanan belum lunas`} />}
        {lihatPesanan && tampakNilai && <Angka label="Penawaran terbuka" nilai={rupiah(terbuka.reduce((s, p) => s + p.total, 0))} ket={`${terbuka.length} penawaran`} />}
        {lihatPesanan && !tampakNilai && <Angka label="Penawaran terbuka" nilai={String(terbuka.length)} ket="Belum dikonfirmasi pelanggan" />}
        {lihatKontak && <Angka label="Tingkat menang" nilai={putus ? persen(hitung("menang") / putus) : "Belum ada"} ket={`${berulang} pelanggan memesan berulang`} />}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {laba && (
          <section className="kartu p-4">
            <h2 className="mb-3 text-sm font-bold">Pendapatan dan biaya 6 bulan</h2>
            <div className="ceruk flex h-44 items-end gap-3 px-4 pb-2 pt-4">
              {tren.map((t) => (
                <div key={t.bulan} className="flex h-full flex-1 flex-col justify-end">
                  <div className="flex h-full items-end gap-1" title={`${namaBulan(t.bulan)}: pendapatan ${rupiah(t.pendapatan)}, biaya ${rupiah(t.biayaLangsung + t.biayaOperasional)}`}>
                    <div className="w-1/2 rounded-t bg-tinta" style={{ height: `${(t.pendapatan / puncak) * 100}%` }} />
                    <div className="w-1/2 rounded-t bg-terpal" style={{ height: `${((t.biayaLangsung + t.biayaOperasional) / puncak) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-center text-[0.68rem] font-semibold text-tinta-lembut">{t.bulan.slice(5)}/{t.bulan.slice(2, 4)}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 flex gap-4 text-xs text-tinta-lembut">
              <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-tinta" />Pendapatan</span>
              <span><span className="mr-1 inline-block size-2.5 rounded-sm bg-terpal" />Biaya</span>
            </p>
          </section>
        )}

        <section className="kartu p-4">
          <h2 className="mb-3 text-sm font-bold">Utilisasi per aset</h2>
          {util.baris.length === 0 ? (
            <Kosong>Belum ada aset.</Kosong>
          ) : (
            <ul className="space-y-2">
              {[...util.baris].sort((a, b) => b.nilai - a.nilai).slice(0, 8).map(({ aset: a, nilai: n }) => (
                <li key={a.id} className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-2 text-sm">
                  <span className="truncate">{a.nama} {a.ukuran}</span>
                  <span className="ceruk h-3 overflow-hidden rounded-full">
                    <span className="block h-full rounded-full bg-lampu-gelap" style={{ width: `${Math.round(n * 100)}%` }} />
                  </span>
                  <span className="text-right text-xs font-semibold tabular-nums">{persen(n)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="kartu p-4">
          <h2 className="mb-3 text-sm font-bold">Jadwal sampai 7 hari ke depan</h2>
          {jadwal.length === 0 ? (
            <Kosong>Tidak ada tugas yang menunggu.</Kosong>
          ) : (
            <ul className="divide-y divide-[#ebe3d3] text-sm">
              {jadwal.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <Link href={`/sistem/jadwal#tugas-${t.id}`} className="font-semibold underline-offset-2 hover:underline">
                      {LABEL_TUGAS[t.jenis]}: {t.acara}
                    </Link>
                    <p className="text-xs text-tinta-lembut">{t.lokasi || "Lokasi belum diisi"} · {t.kru || "Kru belum ditugaskan"}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${t.tanggal < hari ? "text-terpal-gelap" : ""}`}>
                    {tanggal(t.tanggal)}{t.tanggal < hari ? " (lewat)" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {lihatKontak && (
          <section className="kartu p-4">
            <h2 className="mb-3 text-sm font-bold">Pipeline dan tindak lanjut</h2>
            <p className="mb-3 flex flex-wrap gap-2">
              {Object.keys(LABEL_TAHAP).map((t) => (
                <Lencana key={t} nilai={t} teks={`${LABEL_TAHAP[t]} ${hitung(t)}`} />
              ))}
            </p>
            {tindak.length === 0 ? (
              <Kosong>Tidak ada tindak lanjut yang jatuh tempo.</Kosong>
            ) : (
              <ul className="divide-y divide-[#ebe3d3] text-sm">
                {tindak.map((k) => (
                  <li key={k.id} className="flex justify-between gap-3 py-2">
                    <Link href={`/sistem/kontak/${k.id}`} className="font-semibold underline-offset-2 hover:underline">
                      {k.nama}{k.perusahaan && `, ${k.perusahaan}`}
                    </Link>
                    <span className="shrink-0 text-xs text-tinta-lembut">{tanggal(k.tindak_lanjut)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
