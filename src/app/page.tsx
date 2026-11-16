import Image from "next/image";
import Link from "next/link";
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
  const fakta: [string, string][] = [
    [String(aset.length), "jenis barang di katalog"],
    [String(kategori.length), "kategori, dari tenda sampai perlengkapan"],
    ["Diantar, dipasang, dibongkar", "oleh tim kami"],
    ["Penawaran", "sesudah cek ketersediaan tanggal"],
  ];
  return (
    <>
      <a href="#utama" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Langsung ke isi
      </a>
      <header className="sticky top-0 z-40 border-b border-garis bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
          <Link href="/" className="inline-flex min-h-10 items-center font-judul text-base font-bold tracking-tight">{s.nama_usaha}</Link>
          <nav aria-label="Utama" className="hidden gap-6 text-sm font-medium md:flex">
            <a href="#katalog" className="inline-flex min-h-10 items-center hover:text-terpal-gelap">Katalog</a>
            <a href="#cara-sewa" className="inline-flex min-h-10 items-center hover:text-terpal-gelap">Cara sewa</a>
            <a href="#kontak" className="inline-flex min-h-10 items-center hover:text-terpal-gelap">Kontak</a>
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
        <section className="relative h-[420px] overflow-hidden bg-tinta md:h-[460px]">
          <Image
            src="/katalog/11-hero.jpg"
            alt="Atap tenda putih besar di bawah langit biru, foto ilustrasi"
            fill
            preload
            sizes="100vw"
            className="object-cover"
          />
          {/* Di HP teks menutup seluruh lebar, jadi lapisannya rata. Di layar lebar foto dibiarkan terang di sisi kanan. */}
          <div aria-hidden className="absolute inset-0 bg-tinta/70 md:bg-transparent md:bg-linear-to-r md:from-tinta/90 md:via-tinta/65 md:to-tinta/15" />
          <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">Rental tenda dan perlengkapan acara</p>
            <h1 className="mt-3 max-w-2xl text-[30px] font-bold text-white md:text-[46px]">
              Sewa tenda untuk acara Anda, kami yang pasang dan bongkar.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] text-white/85 md:text-base">
              Tenda dan perlengkapannya keluar dari gudang kami sendiri, diantar dan dipasang oleh tim teknis kami. Kirim tanggal dan lokasi
              acara, kami cek ketersediaannya lalu mengirim penawaran.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a href="#kontak" className="tombol tombol-utama px-5">Minta penawaran</a>
              <a href="#katalog" className="tombol px-5">Lihat katalog</a>
              {wa && (
                <a href={tautanWa(wa, sapa)} target="_blank" rel="noopener noreferrer" className="tombol px-5">
                  Chat WhatsApp
                </a>
              )}
            </div>
          </div>
          <p className="absolute bottom-2 right-3 text-xs text-white/80">Foto ilustrasi</p>
        </section>

        <div className="border-b border-garis">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4 [&>div]:border-garis [&>div]:px-4 [&>div]:py-3 [&>div:nth-child(odd)]:border-r [&>div:nth-child(-n+2)]:border-b md:[&>div]:border-b-0 md:[&>div]:border-r md:[&>div:last-child]:border-r-0 md:[&>div:nth-child(-n+2)]:border-b-0">
            {fakta.map(([angka, ket]) => (
              <div key={ket}>
                <dt className="text-[15px] font-bold tabular-nums">{angka}</dt>
                <dd className="text-[13px] text-tinta-lembut">{ket}</dd>
              </div>
            ))}
          </dl>
        </div>

        <section id="katalog" className="mx-auto max-w-7xl scroll-mt-14 px-4 py-7 md:py-10">
          <Katalog barang={barang} wa={wa} namaUsaha={s.nama_usaha} />
          <p className="mt-4 text-xs text-tinta-lembut">Foto di katalog adalah foto ilustrasi, wujud barang bisa berbeda.</p>
        </section>

        <section id="cara-sewa" className="scroll-mt-14 border-y border-garis bg-kertas">
          <div className="mx-auto max-w-7xl px-4 py-7 md:py-10">
            <h2 className="text-2xl font-bold">Cara sewa</h2>
            <ol className="mt-4 grid gap-px border border-garis bg-garis md:grid-cols-2 lg:grid-cols-5">
              {LANGKAH.map(([judul, isi], i) => (
                <li key={judul} className="bg-white p-4">
                  <span className="text-sm font-bold tabular-nums text-terpal">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-1 text-base font-semibold">{judul}</h3>
                  <p className="mt-1 text-[13px] leading-snug text-tinta-lembut">{isi}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="kontak" className="mx-auto grid max-w-7xl scroll-mt-14 gap-6 px-4 py-7 md:py-10 lg:grid-cols-[1fr_1.7fr] lg:gap-10">
          <div>
            <h2 className="text-2xl font-bold">Minta penawaran</h2>
            <p className="mt-2 text-tinta-lembut">Ceritakan acaranya. Kami menghubungi Anda lewat nomor yang diisi.</p>
            {wa && (
              <a href={tautanWa(wa, sapa)} target="_blank" rel="noopener noreferrer" className="tombol tombol-utama mt-4 px-5">
                Lebih cepat lewat WhatsApp
              </a>
            )}
            <div className="mt-5 border-t border-garis pt-4 text-sm">
              <p className="font-semibold">Supaya penawaran cepat keluar, siapkan:</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-tinta-lembut lg:grid-cols-1">
                <li>Tanggal pasang dan tanggal acara</li>
                <li>Alamat lokasi dan jenis permukaannya</li>
                <li>Perkiraan jumlah tamu</li>
                <li>Jenis acara dan barang yang diminati</li>
              </ul>
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              {s.telepon && <div><dt className="inline font-semibold">Telepon: </dt><dd className="inline">{s.telepon}</dd></div>}
              {s.email && <div><dt className="inline font-semibold">Email: </dt><dd className="inline">{s.email}</dd></div>}
              {s.alamat && <div><dt className="inline font-semibold">Gudang: </dt><dd className="inline">{s.alamat}</dd></div>}
            </dl>
          </div>
          <div className="kartu p-4">
            <Pesan galat={nilai(sp.galat)} ok={nilai(sp.terkirim) ? "Permintaan Anda sudah kami terima. Kami akan menghubungi Anda." : undefined} />
            <form action={kirimPermintaan} className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2">
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
              <div className="sm:col-span-2"><button className="tombol tombol-utama px-5">Kirim permintaan</button></div>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-garis">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 text-[13px] text-tinta-lembut">
          <p>{s.nama_usaha}</p>
          {s.telepon && <p>{s.telepon}</p>}
          <Link href="/kredit-foto" className="inline-flex min-h-10 items-center underline underline-offset-2 hover:text-tinta">Kredit foto</Link>
        </div>
      </footer>

      {wa && (
        <a
          href={tautanWa(wa, sapa)}
          target="_blank"
          rel="noopener noreferrer"
          className="tombol tombol-utama fixed bottom-3 right-3 z-50 px-5 shadow-lg sm:hidden"
        >
          Chat WhatsApp
        </a>
      )}
    </>
  );
}
