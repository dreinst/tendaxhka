import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Bidang, nilai, Pesan, type Cari } from "@/komponen/ui";
import { kirimPermintaan } from "@/lib/aksi";
import { Katalog, type Barang } from "@/komponen/katalog";
import { fotoPerAset, pengaturan, type Aset } from "@/lib/data";
import { semua } from "@/lib/db";
import { urutKategori } from "@/lib/kategori";
import { nomorWa } from "@/lib/hitung";

// Katalog dan kontak dibaca dari basis data, jadi halaman dirender per permintaan.
export const dynamic = "force-dynamic";

const LANGKAH = [
  ["Kirim kebutuhan", "Isi tanggal, lokasi, dan perkiraan jumlah tamu lewat formulir di bawah."],
  ["Terima penawaran", "Kami cek ketersediaan tenda di tanggal itu lalu mengirim rincian harga."],
  ["Konfirmasi booking", "Sesudah Anda setuju, tenda dikunci untuk acara Anda."],
  ["Tim kami memasang", "Kru datang sesuai jadwal dan memasang sebelum acara dimulai."],
  ["Tim kami membongkar", "Selesai acara, kami bongkar dan angkut kembali ke gudang."],
];

// Deretan bendera kecil di tali, diulang selebar halaman.
function Bendera() {
  return (
    <svg aria-hidden className="block h-[34px] w-full">
      <defs>
        <pattern id="bendera" width="120" height="34" patternUnits="userSpaceOnUse">
          <path d="M0 4Q60 16 120 4" fill="none" stroke="#1d2a44" strokeWidth="1.5" />
          <path d="M10 6.5h20l-10 20z" fill="#d8412f" />
          <path d="M50 10h20l-10 20z" fill="#fbf8f1" stroke="#1d2a44" strokeWidth="1" strokeLinejoin="round" />
          <path d="M90 6.5h20l-10 20z" fill="#f2b544" />
        </pattern>
      </defs>
      <rect width="100%" height="34" fill="url(#bendera)" />
    </svg>
  );
}

// Hiasan kecil di luar area foto.
function Tenda() {
  return (
    <svg viewBox="0 0 520 330" role="img" aria-label="Ilustrasi tenda acara bergaris merah putih" className="w-full">
      <ellipse cx="260" cy="304" rx="236" ry="16" fill="#1d2a44" opacity=".12" />
      <path d="M40 150 L4 300 M480 150 L516 300" stroke="#1d2a44" strokeWidth="3" strokeLinecap="round" />
      <path d="M150 28v-22M370 28v-22" stroke="#1d2a44" strokeWidth="4" strokeLinecap="round" />
      <path d="M150 8l26 8-26 8zM370 8l26 8-26 8z" fill="#f2b544" />
      <path d="M40 150 L150 28 L260 112 L370 28 L480 150 Z" fill="#fbf8f1" stroke="#1d2a44" strokeWidth="3" strokeLinejoin="round" />
      <path d="M150 28 L95 150 H40 Z M150 28 L205 150 H150 Z M370 28 L315 150 H260 L260 112 Z M370 28 L425 150 H370 Z" fill="#d8412f" />
      <path d="M40 150 L150 28 L260 112 L370 28 L480 150 Z" fill="none" stroke="#1d2a44" strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 150h440v20q-11 14-22 0t-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0-22 0z" fill="#a52e20" stroke="#1d2a44" strokeWidth="3" strokeLinejoin="round" />
      <path d="M56 176v124M464 176v124M260 176v124" stroke="#1d2a44" strokeWidth="6" strokeLinecap="round" />
      <path d="M62 180h192v120H62z M266 180h192v120H266z" fill="#ebe3d3" />
      <path d="M62 180h192l-26 46q-34 20-70 0-36-20-96-46z M458 180H266l26 46q34 20 70 0 36-20 96-46z" fill="#fbf8f1" stroke="#1d2a44" strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 300h480" stroke="#2f7d5b" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

// Jeda animasi muncul untuk elemen di hero.
const tunda = (ms: number) => ({ "--tunda": `${ms}ms` }) as CSSProperties;

// Tautan chat WhatsApp dengan pesan pembuka yang sudah terisi.
function tautanWa(nomor: string, pesan: string): string {
  return `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;
}

export default async function Beranda({ searchParams }: { searchParams: Cari }) {
  const sp = await searchParams;
  const s = pengaturan();
  // Nomor WhatsApp khusus dipakai lebih dulu, lalu nomor telepon. Tanpa nomor seluler yang sah, tombol tidak tampil.
  const wa = nomorWa(s.whatsapp) ?? nomorWa(s.telepon);
  const sapa = `Halo ${s.nama_usaha}, saya ingin tanya sewa tenda.`;
  const aset = semua<Aset>("SELECT * FROM aset WHERE aktif = 1 AND tampil_web = 1 ORDER BY kategori, harga DESC");
  const foto = fotoPerAset();
  // Hanya kolom yang memang untuk pengunjung yang dikirim ke browser.
  const barang: Barang[] = aset.map((a) => ({
    id: a.id,
    nama: a.nama,
    ukuran: a.ukuran,
    kategori: a.kategori,
    satuan: a.satuan,
    harga: a.harga,
    deskripsi: a.deskripsi,
    kapasitas: a.kapasitas,
    cocok: a.cocok,
    foto: foto.get(a.id) ?? [],
  }));
  const kategori = urutKategori(aset.map((a) => a.kategori));
  return (
    <>
      <a href="#utama" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Langsung ke isi
      </a>
      <header className="sticky top-0 z-40 border-b border-garis bg-kanvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-judul text-base font-bold">{s.nama_usaha}</Link>
          <nav aria-label="Utama" className="hidden gap-6 text-sm font-semibold md:flex">
            <a href="#katalog" className="hover:text-terpal-gelap">Katalog</a>
            <a href="#cara-sewa" className="hover:text-terpal-gelap">Cara sewa</a>
            <a href="#kontak" className="hover:text-terpal-gelap">Kontak</a>
          </nav>
          <div className="flex gap-2">
            {wa && (
              <a href={tautanWa(wa, sapa)} target="_blank" rel="noopener noreferrer" className="tombol hidden sm:inline-flex">
                Chat WhatsApp
              </a>
            )}
            <a href="#kontak" className="tombol tombol-utama">Minta penawaran</a>
          </div>
        </div>
      </header>

      <main id="utama">
        <section className="relative overflow-hidden">
          <p aria-hidden className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-judul text-[22vw] font-bold leading-none text-tinta/[0.045]">
            TENDA
          </p>
          <div className="relative"><Bendera /></div>
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 md:grid-cols-2 md:pb-20 md:pt-10">
            <div>
              <h1 style={tunda(0)} className="muncul text-3xl font-bold leading-tight md:text-5xl md:leading-[1.15]">
                Sewa tenda untuk acara Anda, kami yang <span className="stabilo">pasang dan bongkar</span>.
              </h1>
              <p style={tunda(120)} className="muncul mt-5 max-w-md text-base text-tinta-lembut md:text-lg">
                Tenda dan perlengkapannya keluar dari gudang kami sendiri, diantar dan dipasang oleh tim teknis kami. Kirim tanggal dan lokasi
                acara, kami cek ketersediaannya lalu mengirim penawaran.
              </p>
              <div style={tunda(240)} className="muncul mt-7 flex flex-wrap gap-3">
                <a href="#kontak" className="tombol tombol-utama px-5 text-base">Minta penawaran</a>
                {wa && (
                  <a href={tautanWa(wa, sapa)} target="_blank" rel="noopener noreferrer" className="tombol px-5 text-base">
                    Chat WhatsApp
                  </a>
                )}
                <a href="#katalog" className="tombol px-5 text-base">Lihat katalog</a>
              </div>
              <p style={tunda(360)} className="muncul stiker mt-8 max-w-[15rem]">Diantar, dipasang, dibongkar tim kami</p>
            </div>
            <div style={tunda(180)} className="muncul relative mx-auto w-full max-w-lg px-2 pb-6 md:max-w-none md:pb-16">
              <figure className="foto-cetak">
                <span aria-hidden className="selotip left-3 -rotate-6" />
                <span aria-hidden className="selotip right-3 rotate-6" />
                <div className="slot-foto rounded-md">
                  <Image
                    src="/katalog/11-hero.jpg"
                    alt="Atap tenda putih besar di bawah langit biru, foto ilustrasi"
                    width={1800}
                    height={1200}
                    sizes="(min-width: 1152px) 540px, (min-width: 768px) 45vw, 90vw"
                    preload
                    className="block h-auto w-full"
                  />
                </div>
                <figcaption className="pb-1 pt-3 text-center text-xs font-semibold text-tinta-lembut">Foto ilustrasi</figcaption>
              </figure>
              <div aria-hidden className="absolute bottom-0 left-0 hidden w-24 md:block"><Tenda /></div>
            </div>
          </div>
          <div className="lisplang" aria-hidden />
        </section>

        {kategori.length > 0 && (
          <nav aria-label="Kategori barang" className="border-b border-garis bg-kertas">
            <div className="garis-atap" aria-hidden />
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4">
              <span className="mr-1 text-sm font-semibold text-tinta-lembut">Yang bisa disewa</span>
              {kategori.map((k) => (
                <a key={k} href="#katalog" className="chip">{k}</a>
              ))}
            </div>
          </nav>
        )}

        <section id="katalog" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <h2 className="text-2xl font-bold md:text-3xl">Katalog sewa</h2>
          <p className="mt-2 max-w-xl text-tinta-lembut">Harga per hari, belum termasuk antar, pasang, dan bongkar. Buka rincian untuk melihat foto dan menghitung perkiraan biaya.</p>
          <Katalog barang={barang} wa={wa} namaUsaha={s.nama_usaha} />
          <p className="mt-6 text-xs text-tinta-lembut">Foto di katalog adalah foto ilustrasi, wujud barang bisa berbeda.</p>
        </section>

        <section id="cara-sewa" className="scroll-mt-20 bg-tinta text-white">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-bold md:text-3xl">Cara sewa</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-5">
              {LANGKAH.map(([judul, isi], i) => (
                <li key={judul} className="tali-langkah rounded-[10px] border border-white/15 border-b-4 border-b-black/40 bg-white/[0.07] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]">
                  <span className="grid size-9 place-items-center rounded-lg border-b-4 border-lampu-gelap bg-lampu font-judul text-sm font-bold text-tinta">{i + 1}</span>
                  <h3 className="mt-3 font-isi text-base font-bold">{judul}</h3>
                  <p className="mt-1 text-sm text-white/75">{isi}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="kontak" className="mx-auto grid max-w-6xl scroll-mt-20 gap-8 px-4 py-14 md:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Minta penawaran</h2>
            <p className="mt-3 text-tinta-lembut">Ceritakan acaranya. Kami menghubungi Anda lewat nomor yang diisi.</p>
            {wa && (
              <a href={tautanWa(wa, sapa)} target="_blank" rel="noopener noreferrer" className="tombol tombol-utama mt-5 px-5 text-base">
                Lebih cepat lewat WhatsApp
              </a>
            )}
            <dl className="mt-6 space-y-2 text-sm">
              {s.telepon && <div><dt className="inline font-semibold">Telepon: </dt><dd className="inline">{s.telepon}</dd></div>}
              {s.email && <div><dt className="inline font-semibold">Email: </dt><dd className="inline">{s.email}</dd></div>}
              {s.alamat && <div><dt className="inline font-semibold">Gudang: </dt><dd className="inline">{s.alamat}</dd></div>}
            </dl>
          </div>
          <div className="kartu p-5">
            <Pesan galat={nilai(sp.galat)} ok={nilai(sp.terkirim) ? "Permintaan Anda sudah kami terima. Kami akan menghubungi Anda." : undefined} />
            <form action={kirimPermintaan} className="grid gap-3 sm:grid-cols-2">
              <Bidang label="Nama" id="nama">
                <input className="isian" id="nama" name="nama" required maxLength={80} autoComplete="name" />
              </Bidang>
              <Bidang label="Telepon atau WhatsApp" id="telepon">
                <input className="isian" id="telepon" name="telepon" required inputMode="tel" maxLength={30} autoComplete="tel" />
              </Bidang>
              <Bidang label="Perusahaan atau instansi (opsional)" id="perusahaan">
                <input className="isian" id="perusahaan" name="perusahaan" maxLength={120} autoComplete="organization" />
              </Bidang>
              <Bidang label="Tanggal acara" id="tanggal">
                <input className="isian" id="tanggal" name="tanggal" type="date" />
              </Bidang>
              <Bidang label="Lokasi acara" id="lokasi" className="sm:col-span-2">
                <input className="isian" id="lokasi" name="lokasi" maxLength={200} />
              </Bidang>
              <Bidang label="Jenis acara (opsional)" id="jenis_acara">
                <input className="isian" id="jenis_acara" name="jenis_acara" maxLength={100} placeholder="Resepsi, wisuda, pameran" />
              </Bidang>
              <Bidang label="Perkiraan jumlah tamu (opsional)" id="tamu">
                <input className="isian" id="tamu" name="tamu" type="number" inputMode="numeric" min={1} max={100000} />
              </Bidang>
              <Bidang label="Kebutuhan" id="kebutuhan" className="sm:col-span-2">
                <textarea className="isian" id="kebutuhan" name="kebutuhan" rows={4} maxLength={1000} placeholder="Tenda atau perlengkapan yang diminati" />
              </Bidang>
              <div className="hidden" aria-hidden>
                <label htmlFor="situs">Jangan diisi</label>
                <input id="situs" name="situs" tabIndex={-1} autoComplete="off" />
              </div>
              <div className="sm:col-span-2"><button className="tombol tombol-utama px-5 text-base">Kirim permintaan</button></div>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-garis">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-tinta-lembut">
          <p>{s.nama_usaha}</p>
          {s.telepon && <p>{s.telepon}</p>}
          <Link href="/kredit-foto" className="underline underline-offset-2 hover:text-tinta">Kredit foto</Link>
        </div>
      </footer>

      {wa && (
        <a
          href={tautanWa(wa, sapa)}
          target="_blank"
          rel="noopener noreferrer"
          className="tombol tombol-utama fixed bottom-4 right-4 z-50 px-5 shadow-lg sm:hidden"
        >
          Chat WhatsApp
        </a>
      )}
    </>
  );
}
