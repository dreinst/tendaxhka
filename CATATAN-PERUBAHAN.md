# Catatan perubahan branch perbaikan-review

Perbaikan hasil review keamanan dan logika atas draf awal (commit `b3faf4f`). Setiap bagian di bawah sama dengan satu commit, urut dari yang paling mendesak.

| No | Commit | Isi |
|---|---|---|
| 1 | `912b130` | Admin pertama wajib memakai kode `SETUP_TOKEN` |
| 2 | `1dfccde` | Pembatas login tidak bisa diakali header palsu |
| 3 | `481d77a` | Seed menolak produksi, login tidak membocorkan username, robots.txt bersih |
| 4 | `b4ae461` | Empat bug logika pesanan, aset, dan bagi hasil |
| 5 | `39961c7` | Jejak audit |
| 6 | `a96abdd` | Sesi habis setelah 12 jam tidak dipakai |
| 7 | `2c87181` | Tombol WhatsApp di website |
| 8 | `e3f37bd` | Unit dalam perawatan tidak bisa melebihi jumlah aset |
| 9 | `e8089a4` | Jejak audit mencatat tanggal lama pesanan |
| 10 | `67e152e` | Foto aset di dashboard |
| 11 | `b404d55` | Katalog interaktif di landing page |

## Yang perlu dilakukan di server sebelum deploy

- Isi `SETUP_TOKEN` (minimal 16 karakter) di `.env`, lalu buat admin pertama lewat `/masuk`.
- Pasang `proxy_set_header X-Real-IP $remote_addr;` di Nginx (atau pakai Cloudflare), lalu isi `HEADER_IP=x-real-ip` (atau `cf-connecting-ip`).
- Jangan jalankan `npm run seed` di server. Sekarang seed memang menolak kalau `NODE_ENV=production`.
- Isi nomor telepon atau WhatsApp di Pengaturan supaya tombol WhatsApp muncul di website.
- Basis data lama tidak perlu dimigrasi manual. Tabel `log_aktivitas` dan kolom `sesi.batas` dibuat otomatis saat aplikasi dibuka.

## Pemeriksaan

- `npm run lint` dan `npm run typecheck` lulus.
- `npm test`: 23 tes lulus, termasuk 8 tes baru (`hariTerpadat`, jejak audit tidak bisa diubah, `nomorWa`, `unitDirawat`, nama berkas foto, pemeriksaan JPEG, urutan sampul, penyimpanan berkas foto).
- `npm run build` lulus. Build dijalankan di salinan yang font Google-nya diganti dummy, karena mesin uji tidak bisa mengakses fonts.googleapis.com. Kodenya sendiri tidak diubah untuk itu.
- Uji di browser dengan `next dev`:
  - 12 percobaan login salah dengan `x-forwarded-for` berbeda tetap terkunci di percobaan ke-6.
  - Di basis data kosong, kode penyiapan yang salah ditolak dan kode yang benar membuat admin.
  - Halaman `/sistem/log` menampilkan catatan login.
  - Tombol WhatsApp tampil di HP dan desktop.
- Migrasi kolom `sesi.batas` diuji dengan basis data yang dibuat dari skema `b3faf4f`.
- Skenario perbaikan bug diuji di browser dengan data contoh, lalu hasilnya dicocokkan dengan isi basis data:
  - Tanggal pesanan booking digeser: tugas pasang dan bongkar ikut pindah, dan tugas yang tanggalnya sudah diubah manual tidak ikut.
  - Pembayaran ke partner di atas bagiannya ditolak, dan yang pas diterima.
  - Booking dikembalikan ke penawaran atau dibatalkan: tugas terhapus dan tahap kontak berubah. Kontak yang punya pesanan lain tetap Menang.
  - Perawatan yang membuat booking kekurangan menampilkan peringatan. Perawatan yang totalnya melebihi jumlah aset ditolak.
- Foto dan katalog diuji di browser:
  - Tanpa login, `/sistem/aset` dialihkan ke `/masuk`. Peran kru tidak melihat tombol unggah dan hapus.
  - Aset baru dengan dua foto (JPG 2400 piksel dan PNG) tersimpan sebagai JPEG kecil, lalu tampil di katalog dengan foto sampul.
  - Jadikan sampul, saringan kategori, galeri, perkiraan biaya (3 unit selama 2 hari = Rp 7.200.000), dan isi pesan WhatsApp sesuai.
  - `/foto/..%2Fuji.db` dan nama berkas lain yang tidak sah dijawab 404. Menghapus foto juga menghapus berkasnya.
  - Tidak ada gulir ke samping di layar HP 390 piksel.

## Belum dikerjakan, perlu keputusan bersama

- Peran partner masih bisa melihat nama, telepon, dan email semua pelanggan. Apakah memang perlu, atau cukup angka keuangan saja?
- Rugi ikut dibagi 50:50 di `hitungLaba`. Deck kerja sama hanya menyebut nett profit, jadi ini perlu ditulis di perjanjian.
- Persen pajak, persen cadangan, dan basis pendapatan (kas atau akrual) masih nilai bawaan.
- Fitur yang dijanjikan deck tapi belum ada: rekonsiliasi bank, notifikasi WhatsApp otomatis, data kru sebagai tabel, dan KPI klien korporat.
- CSP masih memakai `'unsafe-inline'` untuk skrip bawaan Next. Risikonya kecil karena React sudah meng-escape isi, tapi bisa diperketat dengan nonce nanti.

## 1. Admin pertama butuh kode penyiapan

Masalah: saat basis data kosong, siapa pun yang pertama membuka `/masuk` bisa membuat akun admin. Kalau situs sudah online sebelum pemilik sempat membuat akun, orang asing bisa menguasai sistem.

Perubahan:

- Formulir admin pertama sekarang meminta kode yang sama dengan `SETUP_TOKEN` di `.env`. Kode minimal 16 karakter. Kalau `SETUP_TOKEN` kosong, formulir selalu menolak.
- Kode dibandingkan dengan `samaAman()` di `src/lib/sandi.ts` supaya waktu responsnya tidak membocorkan isi kode.
- `.env.example` dan README menjelaskan cara membuat kodenya.

Yang perlu dilakukan: isi `SETUP_TOKEN` di `.env` server sebelum deploy. Setelah admin pertama dibuat, kode ini tidak dipakai lagi.

## 2. Pembatas login tidak bisa diakali dengan header palsu

Masalah: batas 5 percobaan login per 15 menit dihitung dari IP di header `x-forwarded-for`. Pengirim bisa mengisi header itu sesukanya, jadi cukup mengganti nilainya tiap percobaan untuk menebak kata sandi tanpa batas. Celah yang sama ada di formulir permintaan penawaran, sehingga CRM bisa dibanjiri spam.

Perubahan:

- `alamatIp()` pindah ke `src/lib/auth.ts` dan hanya membaca header yang disebut `HEADER_IP` di `.env`. Kalau kosong, semua pengunjung dianggap satu alamat.
- Login sekarang punya tiga batas: 5 per alamat dan username, 10 per username dari alamat mana pun, dan 20 per alamat untuk semua username (60 kalau IP tidak diketahui). Semua dalam 15 menit.
- Formulir website punya batas total 60 kiriman per jam di samping batas per alamat.
- Peta pencatat percobaan dibersihkan kalau isinya lebih dari 5000 kunci, supaya memori tidak terus membesar.

Yang perlu dilakukan: di server, pasang `proxy_set_header X-Real-IP $remote_addr;` di Nginx (atau pakai `cf-connecting-ip` kalau lewat Cloudflare), lalu isi `HEADER_IP` dengan nama header itu.

Konsekuensi: orang yang sengaja salah sandi 10 kali bisa membuat satu akun tidak bisa masuk selama 15 menit. Itu harga yang wajar dibanding tebakan sandi tanpa batas.

## 3. Seed, waktu respons login, dan robots.txt

Masalah:

- `npm run seed` membuat enam akun dengan kata sandi `tenda12345` yang tertulis di repo. Kalau seed sempat dijalankan di server, siapa pun yang pernah melihat repo bisa masuk sebagai admin.
- Login menjawab lebih cepat kalau username tidak ada, karena `scrypt` yang lambat hanya dijalankan untuk username yang ada. Dari selisih waktu itu, penyerang bisa tahu username mana yang terdaftar.
- `robots.txt` mencantumkan `/sistem`, `/cetak`, dan `/masuk`. Berkas itu publik, jadi siapa pun bisa melihat daftar alamat internal.

Perubahan:

- Seed menolak berjalan kalau `NODE_ENV=production`. Kata sandi akun contoh dibuat acak setiap kali seed jalan dan ditampilkan di terminal. `SANDI_CONTOH` bisa diisi kalau ingin kata sandi tetap untuk lokal.
- Username yang tidak ada tetap menjalankan `scrypt` terhadap hash palsu (`cocokSandiPalsu()` di `src/lib/sandi.ts`), jadi waktu jawabannya sama.
- `disallow` dihapus dari `src/app/robots.ts`. Halaman internal tetap tidak diindeks karena `next.config.ts` sudah mengirim header `X-Robots-Tag: noindex`.

Catatan soal alamat admin: alamat `/masuk` dan `/sistem` yang mudah ditebak bukan celah, karena setiap halaman dan aksi tetap memeriksa sesi lewat `wajib()`. Menyamarkan alamat hanya memperlambat penyerang sebentar.

## 4. Empat bug logika

### Jadwal kru tidak ikut pindah saat tanggal pesanan diubah

Tugas pasang dan bongkar dibuat sekali saat booking. Kalau tanggal acara digeser, kru tetap melihat tanggal lama. Sekarang `simpanPesanan` ikut menggeser tugas pasang ke tanggal mulai baru dan tugas bongkar ke tanggal selesai baru. Tugas yang sudah selesai atau yang tanggalnya sudah diubah manual tidak disentuh.

### Overbooking diam-diam karena stok berkurang

Mencatat unit masuk perawatan atau menurunkan jumlah aset tidak dicek terhadap booking yang sudah ada. Contohnya 10 tenda sudah dibooking semua, lalu 3 dicatat rusak, dan tidak ada peringatan apa pun.

Sekarang ada `hariTerpadat()` di `src/lib/data.ts` yang mencari hari dengan pemakaian terbanyak sejak tanggal tertentu. Setelah perawatan dicatat atau jumlah aset diubah, sistem menampilkan peringatan kalau ada tanggal yang kebutuhannya melebihi stok. Perubahannya tetap disimpan, karena unit yang rusak atau hilang memang tidak bisa dipakai, tapi gudang dan sales langsung tahu booking mana yang perlu diatur ulang. Ada tes baru untuk fungsi ini.

### Pembayaran ke partner tidak divalidasi

`catatBayarPartner` menerima angka berapa pun, bahkan untuk periode yang belum ditutup. Sekarang periode harus sudah ditutup, dan pembayaran ke tiap partner tidak boleh melebihi bagiannya. Saat rugi, batasnya nol.

### Booking yang dilepas meninggalkan sisa

Kalau status booking dikembalikan ke penawaran atau dibatalkan, tugas pasang dan bongkar tetap muncul di jadwal kru dan kontak tetap di tahap Menang. Sekarang tugas yang belum selesai dihapus. Kontak yang tidak punya booking lain kembali ke tahap Penawaran, atau Kalah kalau pesanannya batal. Saat dibooking ulang, tugas pasang dan bongkar dibuat lagi per jenis.

## 5. Jejak audit

Masalah: kerja sama ini membagi nett profit 50:50, tapi tidak ada catatan siapa yang menambah, mengubah, atau menghapus pembayaran, biaya, atau angka bagi hasil. Kalau suatu saat ada selisih, kedua partner tidak punya bukti.

Perubahan:

- Tabel baru `log_aktivitas` di `db/skema.sql` (waktu WIB, pengguna, aksi, rincian). Dua pemicu SQLite menolak UPDATE dan DELETE, jadi catatan hanya bisa bertambah.
- `catatLog()` dan `daftarLog()` di `src/lib/data.ts`, `waktuKini()` di `src/lib/format.ts`.
- Yang dicatat: login berhasil, admin pertama, buat dan ubah pesanan (total lama dan baru), ubah status, terbitkan faktur, hapus pesanan, pembayaran masuk dan penghapusannya, biaya dan penghapusannya, tambah aset dan perubahan jumlah atau harga, tutup dan buka periode, pembayaran ke partner (nilai lama dan baru), perubahan pengaturan (rumus bagi hasil lengkap dengan nilai lamanya), serta tambah dan ubah pengguna.
- Halaman baru `/sistem/log` per bulan. Bisa dibuka admin dan partner (hak `keuangan.lihat`), jadi kedua pihak bisa memeriksa sendiri.
- Tes baru memastikan catatan tidak bisa diubah atau dihapus.

Batasan: pemicu hanya mencegah perubahan lewat aplikasi. Siapa pun yang memegang berkas `tenda.db` di server tetap bisa mengubahnya. Sebaiknya cadangan basis data rutin disalin ke tempat yang bisa diakses kedua partner.

## 6. Sesi habis kalau lama tidak dipakai

Masalah: sesi berlaku 14 hari penuh tanpa batas tidak aktif. Akun yang lupa keluar di laptop atau HP orang lain tetap terbuka selama dua minggu.

Perubahan:

- Tabel `sesi` punya kolom baru `batas` (umur maksimal 14 hari sejak masuk). `kedaluwarsa` sekarang berarti batas tidak aktif: 12 jam, bergeser maju setiap kali sesi dipakai, tapi tidak pernah melewati `batas`.
- Supaya tidak menulis ke basis data di setiap permintaan, penggeseran hanya terjadi kalau sisa waktunya sudah berkurang lebih dari 5 menit.
- Basis data lama otomatis mendapat kolom `batas` lewat pengecekan di `src/lib/db.ts`, karena `ALTER TABLE` di SQLite tidak punya `IF NOT EXISTS`. Sesi lama tetap berlaku sampai batas 14 harinya. Ini sudah diuji dengan basis data dari skema `b3faf4f`.

## 7. Tombol WhatsApp di website

Masalah: website hanya punya formulir. Calon penyewa tenda di Indonesia lebih sering langsung chat WhatsApp, dan tanpa tombol itu banyak calon klien yang batal menghubungi.

Perubahan:

- Pengaturan punya kolom baru "Nomor WhatsApp, kalau beda dari telepon". Kalau kosong, nomor telepon yang dipakai.
- `nomorWa()` di `src/lib/hitung.ts` mengubah "0812-...", "+62 812 ...", atau "812 ..." menjadi format `62812...` untuk `wa.me`. Nomor yang bukan nomor seluler (misalnya telepon kantor) tidak memunculkan tombol. Ada tesnya.
- Tombol "Chat WhatsApp" muncul di header (layar lebar), di bagian atas halaman, di bagian kontak, dan sebagai tombol mengambang di HP. Tiap item katalog punya tautan "Tanya lewat WA" dengan nama barangnya sudah terisi di pesan.
- Tautan "Masuk sistem" di footer website diganti nomor telepon. Pelanggan tidak perlu tautan itu, dan tim cukup menyimpan alamat `/masuk` di bookmark. Ini hanya merapikan tampilan. Keamanannya tetap bergantung pada `wajib()`.

Catatan: chat WhatsApp tidak otomatis masuk CRM. Sales perlu menambah kontaknya manual dengan sumber "whatsapp" supaya laporan sumber lead tetap lengkap.

## 8. Unit dalam perawatan tidak bisa melebihi jumlah aset

Masalah: saat mencatat perawatan, sistem hanya memeriksa satu catatan itu saja. Tenda yang jumlahnya 12 bisa punya 14 unit "masih diperbaiki" kalau dicatat dua kali (12 lalu 2), dan angka sisa di kalender jadi minus. Ini ditemukan saat menguji skenario peringatan stok di browser.

Perubahan:

- `unitDirawat()` di `src/lib/data.ts` menjumlahkan semua perawatan yang masih berjalan untuk satu aset.
- `tambahPerawatan` menolak catatan baru kalau totalnya melebihi jumlah aset, dan pesannya menyebut berapa unit lagi yang masih bisa dicatat.
- Ada tes baru untuk `unitDirawat()`.

## 9. Jejak audit mencatat tanggal lama pesanan

Masalah: catatan "Ubah pesanan" hanya memuat tanggal baru. Kalau tanggal acara digeser, tidak terlihat dari tanggal berapa.

Perubahan: `simpanPesanan` sekarang menulis "tanggal dari A sampai B menjadi C sampai D" kalau tanggalnya berubah, dan "tanggal tetap" kalau tidak. Total lama dan baru tetap dicatat seperti sebelumnya.

## 10. Foto aset di dashboard

Masalah: katalog di landing page hanya menampilkan ilustrasi, karena belum ada cara menyimpan foto tenda.

Perubahan:

- Tabel baru `aset_foto` dan kolom `kapasitas` serta `cocok` di tabel `aset`. Basis data lama mendapat kolom baru lewat pengecekan di `src/lib/db.ts`.
- Halaman `/sistem/aset/[id]` punya bagian "Foto untuk katalog website": unggah beberapa foto sekaligus (klik atau seret), jadikan sampul, dan hapus. Hanya peran yang punya hak `aset.tulis` (admin dan gudang) yang melihat tombolnya.
- Foto dikecilkan di browser ke sisi terpanjang 1000 piksel sebelum dikirim. Server memeriksa bahwa isinya JPEG, paling besar 800 KB, dan paling banyak 8 foto per aset.
- Berkas disimpan di `data/foto` (atau `FOTO_DIR`) dengan nama acak buatan server. Rute `/foto/[nama]` hanya melayani nama berbentuk itu, sehingga alamat seperti `/foto/..%2Ftenda.db` ditolak.
- Formulir aset punya kolom Kapasitas dan Cocok untuk. Aset baru langsung membuka halamannya supaya foto bisa ditambahkan.
- Tes baru untuk nama berkas, pemeriksaan JPEG, urutan sampul, dan penyimpanan berkas.

Yang perlu dilakukan: ikutkan folder `data/foto` dalam cadangan rutin.

## 11. Katalog interaktif di landing page

Masalah: katalog hanya berupa daftar kartu dengan ilustrasi, tanpa cara melihat rincian atau memperkirakan biaya.

Perubahan:

- Komponen baru `src/komponen/katalog.tsx`: saring per kategori, kartu dengan foto sampul, dan jendela rincian berisi galeri foto, ukuran, kapasitas, cocok untuk, jumlah tersedia, serta harga.
- Di jendela rincian, pengunjung mengisi jumlah dan lama sewa, lalu perkiraan biaya langsung tampil.
- Tombol "Tanya lewat WhatsApp" membawa pesan yang sudah berisi nama barang, jumlah, dan lama sewa. Kalau nomor WhatsApp belum diisi di Pengaturan, tombolnya mengarah ke formulir penawaran.
- Hanya kolom untuk pengunjung yang dikirim ke browser. Kode, harga pokok, dan data internal lain tidak ikut.
- Landing page dan dashboard tetap terpisah: pengunjung hanya melihat `/`, sedangkan foto dikelola di `/sistem/aset` setelah login.

## 12. Mode demo untuk pratinjau di Vercel (branch `demo-vercel`)

Masalah: Vercel tidak punya disk tetap, sedangkan sistem ini menyimpan basis data SQLite dan foto sebagai berkas. Tanpa penyesuaian, aplikasi gagal menulis atau datanya hilang tanpa tanda.

Perubahan:

- `MODE_DEMO=1` menaruh basis data dan foto di `/tmp/tenda-demo`, satu-satunya folder yang boleh ditulis di Vercel. Saat basis data masih kosong, sistem mengisinya dengan data contoh dan semua akun contoh memakai `SANDI_DEMO`.
- Isi `skrip/seed.ts` dipindah ke `src/lib/contoh.ts` supaya bisa dipakai oleh `npm run seed` dan oleh mode demo. `npm run seed` tetap menolak berjalan kalau `NODE_ENV=production`.
- Setiap halaman demo menampilkan pita "Versi demo", dan seluruh situs ditandai `noindex` lewat metadata, `robots.txt`, dan header `X-Robots-Tag`.
- `next.config.ts` menyertakan `db/skema.sql` ke server lewat `outputFileTracingIncludes`, karena berkas itu dibaca saat aplikasi berjalan.
- Tanpa `MODE_DEMO`, perilakunya sama persis seperti sebelumnya.

Batasan: data demo hilang setiap kali server dimulai ulang atau setelah deploy baru. Kalau Vercel menjalankan dua server bersamaan, masing-masing punya data sendiri. Ini hanya untuk pratinjau.

Diuji dengan build produksi dan `next start` memakai `MODE_DEMO=1`: basis data terbentuk saat permintaan pertama (bukan saat build), katalog berisi 10 barang contoh, login admin, unggah foto ke `/tmp`, foto tampil di katalog, dan pita demo serta `noindex` muncul.
