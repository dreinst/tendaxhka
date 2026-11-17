# Tenda Indonesia

Website dan sistem internal untuk usaha rental tenda, dibangun untuk kerja sama Tenda Indonesia (aset dan operasional) dengan HKA Management (pengembangan bisnis dan sistem). Alurnya mengikuti proposal kerja sama: inquiry, quotation, booking, pelaksanaan, invoice, lalu tutup periode dan bagi hasil.

Rancangannya mengacu ke Produksia dan HKA Console, tetapi sengaja dibuat jauh lebih kecil: tanpa jurnal akuntansi dan tanpa ORM. Datanya bisa berupa satu berkas SQLite di server sendiri, atau PostgreSQL kalau hostingnya tidak punya disk tetap (misalnya Vercel).

## Menjalankan

Butuh Node.js 24.7 atau lebih baru.

```bash
npm install
npm run seed     # opsional, mengisi data contoh
npm run dev      # http://localhost:3000
```

Tanpa `npm run seed`, halaman `/masuk` menampilkan formulir untuk membuat akun admin pertama. Formulir itu meminta kode `SETUP_TOKEN` dari `.env` (lihat `.env.example`), jadi isi kode itu dulu sebelum situs bisa dibuka orang lain.

Data contoh berisi enam akun (`admin`, `sales`, `gudang`, `kru`, `partner-tenda`, `partner-hka`) dengan satu kata sandi acak yang ditampilkan di terminal setelah seed selesai. Isi `SANDI_CONTOH` (minimal 8 karakter) kalau ingin kata sandi tetap. Seed menolak berjalan kalau `NODE_ENV=production`. Semua aset, harga, pelanggan, dan pesanan di data contoh adalah karangan. Ganti dengan hasil audit gudang dan daftar harga yang sebenarnya sebelum dipakai.

Pemeriksaan sebelum perubahan dianggap selesai:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Isi

| Alamat | Isi |
|---|---|
| `/` | Website: katalog sewa dengan foto, saring kategori, rincian, dan perkiraan biaya; cara sewa; formulir permintaan penawaran |
| `/foto/[nama]` | Foto katalog untuk website. Publik, hanya nama berkas buatan server yang dilayani |
| `/masuk` | Masuk ke sistem |
| `/sistem` | Dasbor: nett profit bulan ini, utilisasi aset, piutang, pipeline, jadwal |
| `/sistem/kontak` | CRM: papan lead per tahap, tindak lanjut |
| `/sistem/pesanan` | Penawaran, booking, pelaksanaan, faktur, pembayaran, biaya langsung |
| `/sistem/kalender` | Sisa unit per aset per hari |
| `/sistem/jadwal` | Tugas pasang dan bongkar, kru, checklist |
| `/sistem/aset` | Data aset, foto untuk katalog website, dan catatan perawatan |
| `/sistem/keuangan` | Biaya operasional, uang masuk, piutang per bulan |
| `/sistem/bagi-hasil` | Nett profit per bulan, tutup periode, pembayaran ke partner |
| `/sistem/log` | Jejak audit: siapa mengubah uang, status pesanan, aset, pengaturan, dan pengguna |
| `/sistem/pengaturan` | Identitas usaha, rumus bagi hasil, checklist bawaan, pengguna |
| `/cetak/[id]` | Penawaran atau faktur siap cetak (simpan sebagai PDF dari dialog cetak browser) |

## Alur kerja

1. Permintaan dari website masuk ke CRM sebagai kontak di tahap Baru. Kontak juga bisa ditambah manual.
2. Sales membuat penawaran dari halaman kontak. Penawaran belum mengunci aset, tetapi halaman pesanan sudah memperingatkan kalau asetnya tidak cukup di tanggal itu.
3. Konfirmasi booking memeriksa ketersediaan tiap aset di seluruh rentang tanggal pasang sampai bongkar. Kalau ada yang kurang, booking ditolak dengan rincian aset yang kurang. Kalau lolos, aset terkunci, kontak pindah ke tahap Menang, dan tugas pasang serta bongkar dibuat dengan checklist bawaan.
4. Kru mencentang checklist di Jadwal kru. Gudang mencatat unit yang rusak di Perawatan, dan unit itu tidak dihitung tersedia sampai ditandai selesai.
5. Pembayaran (DP, pelunasan) dan biaya langsung dicatat di halaman pesanan. Biaya operasional dicatat di Keuangan.
6. Di akhir bulan admin menutup periode di Bagi hasil. Angkanya dibekukan, transaksi di bulan itu terkunci, lalu pembayaran ke tiap partner dicatat.

Pesanan yang berulang bisa disalin menjadi penawaran baru di tanggal lain lewat bagian Pesan ulang.

## Peran

| Peran | Bisa apa |
|---|---|
| Admin | Semua, termasuk keuangan, tutup periode, pengaturan, dan pengguna |
| Sales | CRM, penawaran, booking, pembayaran masuk, penugasan jadwal |
| Gudang | Aset, perawatan, jadwal, checklist. Melihat barang, jumlah, tanggal, dan lokasi pesanan tanpa harga |
| Kru | Melihat jadwal dan kalender, mencentang checklist |
| Partner | Melihat semuanya termasuk keuangan dan bagi hasil, tanpa bisa mengubah |

Daftar haknya ada di `HAK` di `src/lib/hitung.ts`.

Harga, total, pembayaran, dan dokumen cetak (penawaran dan faktur, yang memuat telepon dan email pelanggan) tertutup untuk peran gudang. Admin bisa membukanya di Pengaturan, bagian Akses peran gudang, dan perubahannya tercatat di jejak audit.

## Rumus bagi hasil

```
nett profit = pendapatan - biaya langsung - biaya operasional - pajak - cadangan
pajak       = persen pajak x pendapatan
cadangan    = persen cadangan x (pendapatan - biaya - pajak), hanya kalau hasilnya positif
```

Yang diatur di Pengaturan, tanpa mengubah kode:

- Basis pendapatan: kas (uang yang diterima di bulan itu) atau akrual (nilai faktur yang terbit di bulan itu). Bawaan kas.
- Persen pajak dan persen cadangan. Bawaan 0, isi sesuai perjanjian.
- Porsi Tenda Indonesia. Bawaan 50, sisanya untuk HKA Management.

Rugi ikut dibagi dengan porsi yang sama. Kalau perjanjiannya berbeda, ubah `hitungLaba` di `src/lib/hitung.ts` dan ujinya.

## Basis data

Ada dua mesin basis data di belakang satu antarmuka (`src/lib/db.ts`), dan kode aplikasi tidak perlu tahu yang mana:

- SQLite, satu berkas di `data/tenda.db` (atau `DB_PATH`), lewat `node:sqlite` bawaan Node. Untuk komputer sendiri, uji, mode demo, dan VPS atau container dengan volume.
- PostgreSQL, kalau `DATABASE_URL` diisi. Untuk hosting tanpa disk tetap seperti Vercel, misalnya basis data Neon yang dibuat dari dasbor Vercel.

Skema dipasang sendiri saat basis data dibuka, jadi basis data kosong langsung siap dipakai. Skema SQLite ada di `db/skema.sql` dan dipasang setiap kali berkasnya dibuka. Skema PostgreSQL ada di `db/skema-pg.sql` dan hanya dipasang lagi kalau `VERSI_SKEMA` di `src/lib/db.ts` lebih besar dari yang tersimpan. Jadi setiap perubahan skema ditulis di kedua berkas, lalu angka itu dinaikkan.

SQL di aplikasi ditulis dengan bagian yang sah dan sama artinya di kedua mesin. `npm test` menjalankan uji di SQLite. `npm run test:pg` menjalankan uji yang sama terhadap PostgreSQL di `UJI_DATABASE_URL`, tiap berkas uji di skemanya sendiri. Jalankan keduanya sesudah mengubah kueri.

| Tabel | Isi |
|---|---|
| `pengguna`, `sesi` | Akun dan sesi masuk |
| `pembatas`, `perangkat` | Hitungan percobaan masuk dan formulir website, dan perangkat yang pernah berhasil masuk |
| `pengaturan` | Pasangan kunci dan nilai |
| `aset`, `perawatan` | Aset per jumlah dan unit yang sedang diperbaiki |
| `aset_foto` | Nama berkas foto tiap aset. Urutan terkecil menjadi sampul di katalog |
| `kontak` | Lead dan pelanggan dalam satu tabel, dibedakan tahapnya |
| `pesanan`, `pesanan_baris` | Satu pesanan dari penawaran sampai selesai |
| `pembayaran`, `biaya` | Uang masuk dan biaya (langsung atau operasional) |
| `tugas` | Jadwal lapangan, checklist disimpan sebagai JSON |
| `periode` | Angka bagi hasil yang sudah ditutup |
| `log_aktivitas` | Jejak audit. Pemicu SQLite menolak UPDATE dan DELETE, jadi `npm run seed -- --timpa` tidak mengosongkannya |

Cadangan berkas lokal cukup dengan menyalin berkas basis datanya (`sqlite3 data/tenda.db ".backup cadangan.db"`) dan folder `data/foto` (atau `FOTO_DIR`). Untuk PostgreSQL dan penyimpanan foto di awan, ambil salinan berkala lewat alat masing-masing (misalnya `pg_dump`) dan simpan di tempat yang dipegang kedua partner.

Foto disimpan dalam kualitas HD: browser menyiapkannya sebagai JPEG dengan sisi terpanjang 1920 piksel, biasanya 300 sampai 900 KB per foto. Server hanya menerima isi berkas yang benar-benar JPEG, paling besar 2,5 MB, dan paling banyak 8 foto per aset. Halaman tidak mengirim berkas HD itu utuh: komponen gambar Next membuat ukuran yang pas untuk tiap layar (AVIF atau WebP), jadi foto tetap tajam di layar besar dan ringan di HP.

Berkas fotonya disimpan di salah satu dari tiga tempat: Vercel Blob (kalau proyek Vercel disambungkan ke satu Blob store privat), Cloudflare R2 (kalau empat variabel `R2_*` diisi), atau folder `data/foto`. Di ketiganya foto dilayani lewat `/foto/[nama]` dan disimpan lama di cache browser dan CDN. Jadi penyimpanannya tidak perlu dibuka untuk umum, dan tempat simpan bisa diganti tanpa mengubah alamat foto.

## Struktur kode

- `db/skema.sql`: skema.
- `src/lib/hitung.ts`: hitungan murni (ketersediaan, total, utilisasi, bagi hasil, hak akses).
- `src/lib/db.ts`: satu-satunya berkas yang tahu basis datanya ada di mana (berkas SQLite atau PostgreSQL).
- `src/lib/data.ts`: kueri baca. `src/lib/aksi.ts`: semua aksi server.
- `src/lib/foto.ts`, `src/lib/s3.ts`: penyimpanan foto (folder lokal, Vercel Blob, atau R2) dan tanda tangan permintaan ke R2.
- `src/lib/auth.ts`, `src/lib/sandi.ts`: sesi dan kata sandi (scrypt, token sesi disimpan sebagai hash). Sesi habis setelah 12 jam tidak dipakai dan paling lama 14 hari sejak masuk.
- `src/lib/pembatas.ts`: pembatas percobaan masuk dan formulir website.
- `src/app/page.tsx`: website. `src/app/sistem/**`: halaman sistem.
- `tests/`: uji hitungan dan uji kueri dengan basis data di memori.

## Memasang di Vercel

Semua yang dibutuhkan bisa dibuat dari dasbor Vercel, tanpa mendaftar di layanan lain.

1. Basis data. Di proyek Vercel, buka tab Storage, buat basis data Neon (Postgres), dan sambungkan ke proyek. Pilih wilayah Singapura. Vercel mengisi `DATABASE_URL` dengan sendirinya. Paket gratis Neon memberi 1 GB per proyek dan menidurkan basis data sesudah 5 menit tanpa kunjungan, jadi permintaan pertama sesudah lama sepi sedikit lebih lambat.
2. Foto. Di tab Storage yang sama, buat Blob store dengan akses privat dan sambungkan ke proyek. Vercel mengisi tokennya dengan sendirinya. Paket Hobby memberi 1 GB, cukup untuk lebih dari seribu foto HD.
3. Isi dua variabel lingkungan sendiri:

   ```
   SETUP_TOKEN=   # kode untuk membuat akun admin pertama, minimal 16 karakter
   SITUS_URL=     # alamat situs, untuk metadata dan sitemap
   ```

   `MODE_DEMO` jangan diisi. Aplikasi menolak jalan kalau `MODE_DEMO` dan `DATABASE_URL` diisi bersamaan, supaya data contoh tidak masuk ke basis data asli.
4. Wilayah server. `vercel.json` menaruh fungsi di Singapura (`sin1`) supaya server dan basis data berdekatan. Setiap kueri adalah satu perjalanan jaringan. Kalau basis datanya ditaruh di wilayah lain, ganti wilayah di `vercel.json` ke yang terdekat dengannya.
5. Deploy, buka `/masuk`, lalu buat akun admin pertama dengan kode `SETUP_TOKEN`.

Pilihan lain:

- PostgreSQL mana pun bisa dipakai, cukup isi `DATABASE_URL`. Butuh PostgreSQL 14 atau lebih baru.
- Foto bisa ditaruh di Cloudflare R2 (gratis sampai 10 GB): buat bucket privat dan satu API token dengan izin Object Read & Write untuk bucket itu, lalu isi `R2_ENDPOINT` (bentuknya `https://<id akun>.r2.cloudflarestorage.com`), `R2_BUCKET`, `R2_ACCESS_KEY_ID`, dan `R2_SECRET_ACCESS_KEY`.

Yang perlu diketahui:

- Paket gratis Vercel (Hobby) melarang pemakaian komersial. Untuk usaha yang sungguh berjalan, aturannya menuntut paket Pro.
- Di paket Hobby, Blob yang melewati batas gratisnya tidak bisa diakses sampai 30 hari. Pantau pemakaiannya di dasbor.
- Foto yang sudah ada di folder lokal tidak pindah sendiri ke Blob atau R2. Unggah ulang lewat halaman aset.
- Data dari berkas SQLite yang sudah terisi juga tidak pindah sendiri ke PostgreSQL. Belum ada alat pemindahnya.
- Sesudah deploy pertama, jalankan satu putaran penuh sebelum memasukkan data asli: buat admin, tambah aset, unggah lalu hapus satu foto, dan buat penawaran sampai booking. Uji otomatis di repo ini memakai PostgreSQL lokal dan server S3 tiruan, jadi putaran itulah yang memastikan sambungan ke Neon dan Blob sungguhan.

## Mode demo (Vercel)

Untuk pratinjau di hosting tanpa disk tetap seperti Vercel, isi dua variabel lingkungan:

```
MODE_DEMO=1
SANDI_DEMO=kata-sandi-minimal-8-karakter
```

Dengan `MODE_DEMO=1`, basis data dan foto ditaruh di `/tmp/tenda-demo`, lalu diisi data contoh (`src/lib/contoh.ts`) saat masih kosong. Semua akun contoh (`admin`, `sales`, `gudang`, `kru`, `partner-tenda`, `partner-hka`) memakai `SANDI_DEMO`. Setiap halaman menampilkan pita "Versi demo" dan seluruh situs ditandai `noindex`.

Isinya hilang setiap kali server dimulai ulang, setelah deploy baru, atau saat Vercel memakai server lain. Vercel bisa melayani halaman yang berbeda dari server yang berbeda, dan masing-masing punya basis data sendiri. Karena itu sesi login di mode demo tidak disimpan di basis data, melainkan di cookie yang ditandatangani HMAC dengan kunci turunan `SANDI_DEMO`, sehingga login tetap berlaku di semua halaman. Data yang ditambahkan di satu halaman (misalnya pesanan baru) bisa saja tidak terlihat di halaman lain. Mode ini hanya untuk menunjukkan tampilan, tidak untuk data asli, dan tidak bisa dipakai bersama `DATABASE_URL`. Foto di mode demo juga tidak pernah dikirim ke Blob atau R2.

## Yang perlu diketahui sebelum dipakai sungguhan

- Berkas SQLite lokal butuh disk yang menetap, jadi hanya cocok di VPS atau container dengan volume. Di hosting serverless yang disknya hilang tiap deploy, pakai PostgreSQL dan Blob (lihat bagian Memasang di Vercel).
- Pembatas percobaan masuk dan pembatas formulir website disimpan di basis data, jadi berlaku di semua server dan tidak hilang saat server dimulai ulang. Yang dihitung hanya sandi yang salah, dan percobaan yang sudah ditolak tidak menambah hitungan. Batas per 15 menit: 5 kali per alamat untuk satu username, 20 kali per alamat untuk semua username, dan 10 kali per username dari perangkat yang belum pernah berhasil masuk.
- Perangkat yang pernah berhasil masuk dikenali lewat cookie selama 90 hari dan punya jatah percobaan sendiri. Jadi orang luar yang menghabiskan jatah sebuah username tidak ikut mengunci pemilik akunnya. Yang masih bisa tertahan sampai 15 menit hanya login akun itu dari perangkat baru.
- Alamat pengunjung dibaca dari header yang disebut `HEADER_IP` di `.env`. Isi dengan header yang ditulis proxy sendiri (misalnya `x-real-ip` dari Nginx), karena `x-forwarded-for` dari pengunjung bisa dipalsukan. Di Vercel tidak perlu diisi, karena `x-real-ip` ditulis ulang oleh Vercel. Tanpa alamat, batas per alamat tidak dipakai dan yang berlaku hanya batas per username dan per perangkat.
- Isi identitas usaha, kontak, dan rekening di Pengaturan. Selama kosong, website tidak menampilkan kontak.
- Aset yang belum punya foto tampil dengan ilustrasi SVG pengganti di katalog. Tambahkan foto asli di halaman tiap aset.
- Aset dilacak per jumlah, belum per unit bernomor seri.
- Belum ada: PDF buatan server (cetak memakai dialog browser), unggah foto bukti pasang, notifikasi WhatsApp atau email, dan pengembalian dana.
- Jejak audit hanya mencegah perubahan lewat aplikasi. Orang yang memegang berkas basis data di server tetap bisa mengubahnya, jadi salin cadangan secara berkala ke tempat yang dipegang kedua partner.
