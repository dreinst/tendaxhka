import type { Metadata } from "next";
import Link from "next/link";
import { Kepala, Kosong, nilai, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { daftarPakai, type Aset } from "@/lib/data";
import { semua } from "@/lib/db";
import { hariIni, namaBulan, tanggal as tanggalPendek } from "@/lib/format";
import { batasBulan, bulanSah, geserBulanSah, pakaiPerHari, rentangHari, tambahHari, tanggalSah } from "@/lib/hitung";

export const metadata: Metadata = { title: "Kalender aset" };

const NAMA_HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
type Baris = { a: Aset; terpakai: number[] };

// Urutan hari dalam minggu, Senin 0 sampai Minggu 6.
const hariKe = (t: string) => (new Date(`${t}T00:00:00Z`).getUTCDay() + 6) % 7;

// Rentang Senin sebelum tanggal 1 sampai Minggu sesudah akhir bulan, supaya tiap minggu di HP penuh tujuh hari.
// Di tepi rentang tahun yang sah, rentangnya tidak diperlebar.
function rentangMinggu(awal: string, akhir: string): string[] {
  const mulai = tambahHari(awal, -hariKe(awal));
  const sampai = tambahHari(akhir, 6 - hariKe(akhir));
  return rentangHari(tanggalSah(mulai) ? mulai : awal, tanggalSah(sampai) ? sampai : akhir);
}

// Tanggal dipecah per minggu Senin sampai Minggu. Hari yang tidak ada di rentang berisi string kosong.
function bagiMinggu(tanggal: string[]): string[][] {
  const hasil: string[][] = [];
  let m: string[] = Array<string>(hariKe(tanggal[0])).fill("");
  for (const t of tanggal) {
    m.push(t);
    if (m.length === 7) {
      hasil.push(m);
      m = [];
    }
  }
  if (m.length) hasil.push([...m, ...Array<string>(7 - m.length).fill("")]);
  return hasil;
}

function Sel({ t, total, n, luar }: { t: string; total: number; n: number; luar?: boolean }) {
  const sisa = total - n;
  const warna = n === 0 ? "" : sisa <= 0 ? "bg-terpal text-white" : "bg-[#fbe3b0]";
  return (
    <td className={`px-1 py-1.5 text-center tabular-nums ${warna} ${luar ? "opacity-55" : ""}`} title={`${t}: terpakai ${n}, sisa ${sisa}`}>
      {sisa}
    </td>
  );
}

// Satu minggu untuk tampilan HP. Hari di luar bulan yang dipilih tetap berisi angka, tetapi diredupkan.
function Minggu({ hari, baris, tanggal, bulan, hariIni }: { hari: string[]; baris: Baris[]; tanggal: string[]; bulan: string; hariIni: string }) {
  const isi = hari.filter(Boolean);
  const kini = isi.includes(hariIni);
  const awal = isi[0];
  const akhir = isi[isi.length - 1];
  const judul = `${awal.slice(0, 7) === akhir.slice(0, 7) ? Number(awal.slice(8)) : tanggalPendek(awal).replace(/ \d{4}$/, "")} sampai ${tanggalPendek(akhir)}`;
  const luar = (t: string) => t.slice(0, 7) !== bulan;
  return (
    <section aria-label={`Minggu ${judul}${kini ? ", minggu ini" : ""}`} className={`kartu overflow-hidden ${kini ? "border-2 border-lampu-gelap" : ""}`}>
      <h2 className={`flex items-center justify-between gap-2 px-3 py-2 text-sm font-bold ${kini ? "bg-[#fdf0d2]" : "bg-kertas"}`}>
        {judul}
        {kini && <span className="lencana bg-lampu text-tinta">Minggu ini</span>}
      </h2>
      <table className="w-full table-fixed border-collapse text-xs">
        <colgroup>
          <col />
          {hari.map((_, i) => (
            <col key={i} className="w-[9%]" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="px-2 py-1.5 text-left font-semibold">Aset</th>
            {hari.map((t, i) => (
              <th key={i} scope="col" className={`py-1.5 text-center font-semibold leading-tight ${t === hariIni ? "bg-lampu" : ""} ${!t || luar(t) ? "text-tinta-lembut/70" : ""}`}>
                <abbr title={t || undefined} className="no-underline">{NAMA_HARI[i]}</abbr>
                <span className="block">{t ? Number(t.slice(8)) : ""}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {baris.map(({ a, terpakai }) => (
            <tr key={a.id} className="border-t border-[#ebe3d3]">
              <th scope="row" className="px-2 py-1.5 text-left font-semibold leading-snug">
                {a.nama} {a.ukuran} <span className="font-normal text-tinta-lembut">({a.jumlah})</span>
              </th>
              {hari.map((t, i) => (t ? <Sel key={i} t={t} total={a.jumlah} n={terpakai[tanggal.indexOf(t)]} luar={luar(t)} /> : <td key={i} className="bg-kanvas" />))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default async function Kalender({ searchParams }: { searchParams: Cari }) {
  await wajib("aset.lihat");
  const hari = hariIni();
  const minta = nilai((await searchParams).bulan);
  const bulan = bulanSah(minta) ? minta : hari.slice(0, 7);
  const sebelumnya = geserBulanSah(bulan, -1);
  const berikutnya = geserBulanSah(bulan, 1);
  const { awal, akhir } = batasBulan(bulan);
  // `tanggal` untuk matriks sebulan di layar lebar, `semuaHari` untuk minggu-minggu penuh di HP.
  const tanggal = rentangHari(awal, akhir);
  const semuaHari = rentangMinggu(awal, akhir);
  const [aset, pakai] = await Promise.all([
    semua<Aset>("SELECT * FROM aset WHERE aktif = 1 ORDER BY kategori, nama, ukuran"),
    daftarPakai(semuaHari[0], semuaHari[semuaHari.length - 1]),
  ]);
  const baris = aset.map((a) => ({ a, terpakai: pakaiPerHari(pakai, a.id, semuaHari) }));
  const geser = semuaHari.indexOf(awal);
  const minggu = bagiMinggu(semuaHari);
  const ke = minggu.findIndex((m) => m.includes(hari));
  const lewat = ke > 0 ? minggu.slice(0, ke) : [];
  const sisa = ke > 0 ? minggu.slice(ke) : minggu;
  return (
    <>
      <Kepala judul="Kalender aset" ket={`Sisa unit yang bisa disewakan per hari, ${namaBulan(bulan)}. Penawaran belum mengurangi angka ini.`}>
        {sebelumnya && <Link href={`/sistem/kalender?bulan=${sebelumnya}`} className="tombol tombol-kecil">Bulan sebelumnya</Link>}
        <Link href="/sistem/kalender" className="tombol tombol-kecil">Bulan ini</Link>
        {berikutnya && <Link href={`/sistem/kalender?bulan=${berikutnya}`} className="tombol tombol-kecil">Bulan berikutnya</Link>}
      </Kepala>
      {aset.length === 0 ? (
        <div className="kartu">
          <Kosong>Belum ada aset aktif.</Kosong>
        </div>
      ) : (
        <>
          {/* Layar lebar: matriks sebulan. */}
          <div className="kartu hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th scope="col" className="sticky left-0 z-10 min-w-44 bg-kertas px-3 py-2 text-left">Aset</th>
                    {tanggal.map((t) => (
                      <th key={t} scope="col" className={`min-w-8 px-1 py-2 text-center font-semibold ${t === hari ? "bg-lampu" : ""}`}>
                        {Number(t.slice(8))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {baris.map(({ a, terpakai }) => (
                    <tr key={a.id} className="border-t border-[#ebe3d3]">
                      <th scope="row" className="sticky left-0 z-10 bg-kertas px-3 py-1.5 text-left font-semibold">
                        {a.nama} {a.ukuran} <span className="font-normal text-tinta-lembut">({a.jumlah})</span>
                      </th>
                      {tanggal.map((t, i) => (
                        <Sel key={t} t={t} total={a.jumlah} n={terpakai[geser + i]} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* HP: per minggu (Senin sampai Minggu) tanpa gulir mendatar. Di bulan ini, minggu yang sudah lewat
              dilipat di atas, jadi minggu yang memuat hari ini langsung terlihat. */}
          <div className="space-y-3 md:hidden">
            {lewat.length > 0 && (
              <details className="kartu group">
                <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-semibold">
                  {lewat.length} minggu sebelumnya
                  <span className="ml-auto text-xs font-normal text-tinta-lembut group-open:hidden">Tampilkan</span>
                  <span className="ml-auto hidden text-xs font-normal text-tinta-lembut group-open:inline">Sembunyikan</span>
                </summary>
                <div className="space-y-3 border-t border-garis p-2">
                  {lewat.map((m) => (
                    <Minggu key={m.find(Boolean)} hari={m} baris={baris} tanggal={semuaHari} bulan={bulan} hariIni={hari} />
                  ))}
                </div>
              </details>
            )}
            {sisa.map((m) => (
              <Minggu key={m.find(Boolean)} hari={m} baris={baris} tanggal={semuaHari} bulan={bulan} hariIni={hari} />
            ))}
          </div>
        </>
      )}
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-tinta-lembut">
        <span><span className="mr-1 inline-block size-3 rounded-sm bg-[#fbe3b0] align-middle" />Sebagian terpakai</span>
        <span><span className="mr-1 inline-block size-3 rounded-sm bg-terpal align-middle" />Habis</span>
        <span>Angka di sel adalah sisa unit. Unit yang diperbaiki ikut mengurangi.</span>
      </p>
    </>
  );
}
