import Image from "next/image";
import Link from "next/link";
import { IkonCentang, IkonPanah } from "@/komponen/ikon";
import { Katalog } from "@/komponen/katalog";
import { KakiSitus, KepalaSitus, tautanWa } from "@/komponen/situs";
import { JagaIsian } from "@/komponen/jaga-isian";
import { Bidang, LabelAtas, nilai, Pesan, type Cari } from "@/komponen/ui";
import { kirimPermintaan } from "@/lib/aksi";
import { rupiah } from "@/lib/format";
import { barangKatalog, identitasSitus } from "@/lib/katalog-data";
import { ringkasKategori, tendaTermurah } from "@/lib/kategori";

// Katalog dan kontak dibaca dari basis data, jadi halaman dirender per permintaan.
export const dynamic = "force-dynamic";

const JANJI = ["Diantar dan dipasang tim kami", "Harga per hari tertulis di katalog", "Penawaran sesudah cek tanggal"];

const LANGKAH = [
  ["Kirim kebutuhan", "Isi tanggal, lokasi, dan perkiraan jumlah tamu lewat formulir di bawah."],
  ["Terima penawaran", "Kami cek ketersediaan tenda di tanggal itu lalu mengirim rincian harga."],
  ["Konfirmasi booking", "Sesudah Anda setuju, tenda dikunci untuk acara Anda."],
  ["Tim kami memasang", "Kru datang sesuai jadwal dan memasang sebelum acara dimulai."],
  ["Tim kami membongkar", "Selesai acara, kami bongkar dan angkut kembali ke gudang."],
];

export default async function Beranda({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const [{ s, wa, sapa }, barang] = await Promise.all([identitasSitus(), barangKatalog()]);
  const kategori = ringkasKategori(barang);
  const termurah = tendaTermurah(barang);
  const pita = [
    ...kategori.map((k) => ({
      nama: k.nama,
      // Harga termurah lebih berguna bagi pengunjung daripada jumlah barang. Kategori tanpa harga memakai jumlahnya.
      ket: k.termurah ? `mulai ${rupiah(k.termurah)}` : `${k.jumlah} produk`,
      href: `/produk?kategori=${encodeURIComponent(k.nama)}`,
    })),
    { nama: "Semua produk", ket: `${barang.length} produk`, href: "/produk" },
  ];
  return (
    <>
      <KepalaSitus nama={s.nama_usaha} wa={wa} sapa={sapa} />

      <main id="utama">
        {/* Tiga blok: judul, mozaik foto, lalu tombol. Di HP urutannya begitu supaya foto tenda masuk layar pertama.
            Di layar lebar judul dan tombol bertumpuk di kiri, mozaik di kanan setinggi keduanya. */}
        <section className="mx-auto grid max-w-7xl gap-x-12 gap-y-5 px-4 py-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-y-7 lg:py-12">
          <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
            <h1 className="text-[32px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[44px] lg:text-[54px]">
              Sewa tenda untuk acara Anda, kami yang <span className="text-terpal">pasang dan bongkar.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-tinta-lembut md:text-[17px] lg:mt-5">
              Tenda dan perlengkapannya keluar dari gudang kami sendiri, diantar dan dipasang oleh tim teknis kami.
              <span className="max-sm:hidden"> Kirim tanggal dan lokasi acara, kami cek ketersediaannya lalu mengirim penawaran.</span>
            </p>
          </div>

          {/* Mozaik: tenda terpasang di halaman, tenda saat acara, dan bagian dalamnya. Label harga dihitung dari katalog. */}
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <div className="grid h-[220px] grid-cols-3 grid-rows-2 gap-2 sm:h-[380px] lg:h-[440px] lg:gap-2.5">
              <div className="relative col-span-2 row-span-2 overflow-hidden rounded-xl bg-kertas">
                <Image src="/katalog/21-hero-halaman.jpg" alt="Tenda putih terpasang di taman dengan kursi tamu berjajar di depannya" fill preload quality={85} sizes="(min-width: 1024px) 420px, 66vw" className="object-cover" />
                {termurah && (
                  <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-white px-3 py-2 shadow-[0_8px_24px_-8px_rgb(14_49_56/0.45)] sm:bottom-3 sm:left-3 sm:px-3.5 sm:py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-tinta-lembut">Sewa tenda mulai</p>
                    <p className="font-judul text-lg font-bold leading-tight tabular-nums text-terpal sm:text-xl">{rupiah(termurah.harga)}</p>
                    <p className="text-xs text-tinta-lembut">per {termurah.satuan} per hari</p>
                  </div>
                )}
              </div>
              <div className="relative overflow-hidden rounded-xl bg-kertas">
                <Image src="/katalog/16-puncak-tenda.jpg" alt="Dua puncak tenda putih berlatar langit biru" fill sizes="(min-width: 1024px) 210px, 33vw" className="object-cover" />
              </div>
              <div className="relative overflow-hidden rounded-xl bg-kertas">
                <Image src="/katalog/13-dalam-tenda.jpg" alt="Pandangan dari dalam tenda rangka putih ke arah taman, dengan bangku putih berjajar" fill sizes="(min-width: 1024px) 210px, 33vw" className="object-cover" />
              </div>
            </div>
            <p className="mt-1.5 text-right text-xs text-tinta-lembut">Foto ilustrasi</p>
          </div>

          <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
            <div className="flex flex-wrap gap-3">
              <a href="#kontak" className="tombol tombol-utama tombol-besar max-sm:w-full">
                Minta penawaran
                <IkonPanah />
              </a>
              {/* Di HP pita kategori tepat di bawah sudah mengantar ke katalog, jadi tombol kedua tidak ditampilkan. */}
              <Link href="/produk" className="tombol tombol-garis tombol-besar max-sm:hidden">Lihat katalog produk</Link>
              {wa && (
                <a href={tautanWa(wa, sapa)} target="_blank" rel="noopener noreferrer" className="tombol tombol-garis tombol-besar max-sm:w-full">
                  Chat WhatsApp
                </a>
              )}
            </div>
            <ul className="mt-5 grid gap-2.5 border-t border-garis pt-5 text-sm font-medium sm:grid-cols-3 sm:gap-4 lg:mt-7">
              {JANJI.map((t) => (
                <li key={t} className="flex items-start gap-2 leading-snug">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-tinta text-kunyit"><IkonCentang /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pita kategori: jalan pintas ke katalog yang sudah tersaring. Dua kolom di HP, tiga di tablet, sebaris di layar
            lebar. Sel terakhir melebar kalau barisnya tidak penuh. */}
        {kategori.length > 0 && (
          <nav aria-label="Kategori produk" className="bg-tinta text-white">
            <div className="mx-auto max-w-7xl md:px-4">
              <ul className="flex flex-wrap gap-px bg-white/12 md:border-x md:border-white/12">
                {pita.map((k) => (
                  <li key={k.href} className="grow basis-[calc(50%-1px)] bg-tinta md:basis-[calc(33.333%-1px)] lg:basis-0">
                    <Link href={k.href} className="flex h-full min-h-16 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-tinta-2">
                      <span>
                        <span className="block font-judul text-[15px] font-semibold leading-snug">{k.nama}</span>
                        <span className="block text-xs tabular-nums text-white/70">{k.ket}</span>
                      </span>
                      <IkonPanah className="shrink-0 text-kunyit" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}

        <section id="katalog" className="scroll-mt-16">
          <Katalog barang={barang} wa={wa} namaUsaha={s.nama_usaha} ragam="ringkas" />
        </section>

        <section id="cara-sewa" className="scroll-mt-16 bg-tinta text-white">
          <div className="mx-auto grid max-w-7xl gap-7 px-4 py-9 lg:grid-cols-[0.8fr_1.4fr] lg:gap-12 lg:py-12">
            <div className="relative min-h-[200px] overflow-hidden rounded-xl bg-tinta-2 lg:min-h-0">
              <Image src="/katalog/15-terpasang.jpg" alt="Tenda putih yang sudah terpasang di taman, dengan meja bundar dan kursi di bawahnya" fill sizes="(min-width: 1024px) 440px, 100vw" className="object-cover" />
            </div>
            <div>
              <LabelAtas terang>Cara sewa</LabelAtas>
              <h2 className="mt-3 text-[26px] font-bold md:text-[32px]">Dari permintaan sampai bongkar, lima langkah.</h2>
              <ol className="mt-6 grid gap-x-10 sm:grid-cols-2">
                {LANGKAH.map(([judul, isi], i) => (
                  <li key={judul} className="flex gap-4 border-t border-white/15 py-4">
                    <span className="w-8 shrink-0 font-judul text-[22px] font-bold leading-none tabular-nums text-kunyit">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="font-isi text-base font-semibold tracking-normal">{judul}</h3>
                      <p className="mt-1 text-sm leading-snug text-white/75">{isi}</p>
                    </div>
                  </li>
                ))}
                <li className="flex flex-wrap items-center gap-2.5 border-t border-white/15 py-4">
                  <a href="#kontak" className="tombol tombol-utama min-h-11">
                    Minta penawaran
                    <IkonPanah />
                  </a>
                  <Link href="/produk" className="tombol tombol-terang min-h-11">Lihat katalog</Link>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Formulir selebar halaman dengan empat kolom di layar lebar, supaya tidak ada kolom samping yang kosong. */}
        <section id="kontak" className="scroll-mt-16 bg-kertas">
          <div className="mx-auto max-w-7xl px-4 py-9 lg:py-12">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <div>
                <LabelAtas>Minta penawaran</LabelAtas>
                <h2 className="mt-3 text-[26px] font-bold md:text-[32px]">Ceritakan acaranya, kami kirim penawarannya.</h2>
              </div>
              <p className="max-w-md text-tinta-lembut lg:pb-1">Kami menghubungi Anda lewat nomor yang diisi, sesudah ketersediaan di tanggal acara dicek.</p>
            </div>
            <div className="mt-6 rounded-xl border border-garis bg-white p-4 shadow-[0_12px_32px_-20px_rgb(14_49_56/0.35)] sm:p-6">
              <Pesan galat={nilai(sp.galat)} ok={nilai(sp.terkirim) ? "Permintaan Anda sudah kami terima. Kami akan menghubungi Anda." : undefined} />
              <form action={kirimPermintaan} className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <Bidang label="Nama (wajib)" id="nama">
                  <input className="isian" id="nama" name="nama" required maxLength={80} autoComplete="name" />
                </Bidang>
                <Bidang label="Telepon atau WhatsApp (wajib)" id="telepon">
                  <input
                    className="isian"
                    id="telepon"
                    name="telepon"
                    required
                    inputMode="tel"
                    maxLength={30}
                    autoComplete="tel"
                    // Sama dengan pemeriksaan di kirimPermintaan, supaya salah ketik tertangkap sebelum dikirim.
                    pattern="[\d+\s\(\)\-]{8,30}"
                    title="Nomor telepon 8 sampai 30 karakter, boleh memakai angka, spasi, tanda tambah, kurung, dan tanda hubung"
                  />
                </Bidang>
                <Bidang label="Perusahaan atau instansi" id="perusahaan">
                  <input className="isian" id="perusahaan" name="perusahaan" maxLength={120} autoComplete="organization" />
                </Bidang>
                <Bidang label="Tanggal acara" id="tanggal">
                  <input className="isian" id="tanggal" name="tanggal" type="date" />
                </Bidang>
                <Bidang label="Jenis acara" id="jenis_acara">
                  <input className="isian" id="jenis_acara" name="jenis_acara" maxLength={100} placeholder="Resepsi, wisuda, pameran" />
                </Bidang>
                <Bidang label="Perkiraan jumlah tamu" id="tamu">
                  <input className="isian" id="tamu" name="tamu" type="number" inputMode="numeric" min={1} max={100000} />
                </Bidang>
                <Bidang label="Lokasi acara" id="lokasi" className="sm:col-span-2">
                  <input className="isian" id="lokasi" name="lokasi" maxLength={200} placeholder="Alamat dan jenis permukaannya (rumput, paving, tanah)" />
                </Bidang>
                <Bidang label="Kebutuhan" id="kebutuhan" className="sm:col-span-2 lg:col-span-4">
                  <textarea className="isian" id="kebutuhan" name="kebutuhan" rows={3} maxLength={1000} placeholder="Tenda atau perlengkapan yang diminati, dan tanggal pasang kalau berbeda dari tanggal acara" />
                </Bidang>
                <div className="hidden" aria-hidden>
                  <label htmlFor="situs">Jangan diisi</label>
                  <input id="situs" name="situs" tabIndex={-1} autoComplete="off" />
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:col-span-2 lg:col-span-4">
                  <button className="tombol tombol-utama tombol-besar max-sm:w-full">
                    Kirim permintaan
                    <IkonPanah />
                  </button>
                  {wa && (
                    <a href={tautanWa(wa, sapa)} target="_blank" rel="noopener noreferrer" className="tombol tombol-garis tombol-besar max-sm:w-full">
                      Lebih cepat lewat WhatsApp
                    </a>
                  )}
                  <p className="text-[13px] text-tinta-lembut">Isian selain nama dan telepon boleh dikosongkan.</p>
                  {/* Kalau kiriman ditolak server, isian yang sudah diketik pengunjung dikembalikan. */}
                  <JagaIsian kunci="permintaan" />
                </div>
              </form>
            </div>
            {(s.telepon || s.email || s.alamat) && (
              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-1.5 text-sm">
                {s.telepon && <div><dt className="inline font-semibold">Telepon: </dt><dd className="inline">{s.telepon}</dd></div>}
                {s.email && <div><dt className="inline font-semibold">Email: </dt><dd className="inline">{s.email}</dd></div>}
                {s.alamat && <div><dt className="inline font-semibold">Gudang: </dt><dd className="inline">{s.alamat}</dd></div>}
              </dl>
            )}
          </div>
        </section>
      </main>

      <KakiSitus nama={s.nama_usaha} telepon={s.telepon} email={s.email} alamat={s.alamat} />

      {wa && (
        <a
          href={tautanWa(wa, sapa)}
          target="_blank"
          rel="noopener noreferrer"
          className="tombol tombol-utama fixed bottom-3 right-3 z-50 min-h-11 px-5 shadow-lg sm:hidden"
        >
          Chat WhatsApp
        </a>
      )}
    </>
  );
}
