# Tenda Indonesia

Website dan sistem internal untuk usaha rental tenda, dibangun untuk kerja sama Tenda Indonesia (aset dan operasional) dengan HKA Management (pengembangan bisnis dan sistem). Alurnya mengikuti proposal kerja sama: inquiry, quotation, booking, pelaksanaan, invoice, lalu tutup periode dan bagi hasil.

Rancangannya mengacu ke Produksia dan HKA Console, tetapi sengaja dibuat jauh lebih kecil: tanpa jurnal akuntansi, tanpa ORM, dan basis datanya satu berkas SQLite.

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
| Gudang | Aset, perawatan, jadwal, checklist |
| Kru | Melihat jadwal dan kalender, mencentang checklist |
| Partner | Melihat semuanya termasuk keuangan dan bagi hasil, tanpa bisa mengubah |

Daftar haknya ada di `HAK` di `src/lib/hitung.ts`.

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

Satu berkas SQLite di `data/tenda.db` (atau `DB_PATH`), dibuka lewat `node:sqlite` bawaan Node. Skema di `db/skema.sql` dijalankan setiap kali basis data dibuka, jadi basis data kosong langsung siap dipakai.

| Tabel | Isi |
|---|---|
| `pengguna`, `sesi` | Akun dan sesi masuk |
| `pengaturan` | Pasangan kunci dan nilai |
| `aset`, `perawatan` | Aset per jumlah dan unit yang sedang diperbaiki |
| `aset_foto` | Nama berkas foto tiap aset. Urutan terkecil menjadi sampul di katalog |
| `kontak` | Lead dan pelanggan dalam satu tabel, dibedakan tahapnya |
| `pesanan`, `pesanan_baris` | Satu pesanan dari penawaran sampai selesai |
| `pembayaran`, `biaya` | Uang masuk dan biaya (langsung atau operasional) |
| `tugas` | Jadwal lapangan, checklist disimpan sebagai JSON |
| `periode` | Angka bagi hasil yang sudah ditutup |
| `log_aktivitas` | Jejak audit. Pemicu SQLite menolak UPDATE dan DELETE, jadi `npm run seed -- --timpa` tidak mengosongkannya |

Cadangan cukup dengan menyalin berkas basis datanya (`sqlite3 data/tenda.db ".backup cadangan.db"`) dan folder `data/foto` (atau `FOTO_DIR`).

Foto dikecilkan di browser ke sisi terpanjang 1000 piksel dan disimpan sebagai JPEG, jadi satu foto biasanya 100 sampai 300 KB. Server hanya menerima isi berkas yang benar-benar JPEG, paling besar 800 KB, dan paling banyak 8 foto per aset.

## Struktur kode

- `db/skema.sql`: skema.
- `src/lib/hitung.ts`: hitungan murni (ketersediaan, total, utilisasi, bagi hasil, hak akses).
- `src/lib/data.ts`: kueri baca. `src/lib/aksi.ts`: semua aksi server.
- `src/lib/auth.ts`, `src/lib/sandi.ts`: sesi dan kata sandi (scrypt, token sesi disimpan sebagai hash). Sesi habis setelah 12 jam tidak dipakai dan paling lama 14 hari sejak masuk.
- `src/app/page.tsx`: website. `src/app/sistem/**`: halaman sistem.
- `tests/`: uji hitungan dan uji kueri dengan basis data di memori.

## Mode demo (Vercel)

Untuk pratinjau di hosting tanpa disk tetap seperti Vercel, isi dua variabel lingkungan:

```
MODE_DEMO=1
SANDI_DEMO=kata-sandi-minimal-8-karakter
HEADER_IP=x-real-ip
```

Dengan `MODE_DEMO=1`, basis data dan foto ditaruh di `/tmp/tenda-demo`, lalu diisi data contoh (`src/lib/contoh.ts`) saat masih kosong. Semua akun contoh (`admin`, `sales`, `gudang`, `kru`, `partner-tenda`, `partner-hka`) memakai `SANDI_DEMO`. Setiap halaman menampilkan pita "Versi demo" dan seluruh situs ditandai `noindex`.

Isinya hilang setiap kali server dimulai ulang, setelah deploy baru, atau saat Vercel memakai server lain. Kalau dua server aktif bersamaan, keduanya punya data sendiri-sendiri, jadi sesekali sesi login bisa hilang. Mode ini hanya untuk menunjukkan tampilan, tidak untuk data asli.

## Yang perlu diketahui sebelum dipakai sungguhan

- SQLite butuh disk yang menetap. Sistem ini cocok di VPS atau container dengan volume, dan tidak cocok di hosting serverless yang disknya hilang tiap deploy. Kalau nanti pindah ke PostgreSQL, yang diganti adalah `src/lib/db.ts` dan beberapa sintaks SQL.
- Pembatas percobaan masuk dan pembatas formulir website disimpan di memori proses, jadi hanya berlaku untuk satu server. Pembatas ini membaca IP dari header yang disebut `HEADER_IP` di `.env`. Isi dengan header yang ditulis proxy sendiri (misalnya `x-real-ip`), karena `x-forwarded-for` dari pengunjung bisa dipalsukan. Satu username dikunci 15 menit setelah 10 percobaan dari alamat mana pun.
- Isi identitas usaha, kontak, dan rekening di Pengaturan. Selama kosong, website tidak menampilkan kontak.
- Aset yang belum punya foto tampil dengan ilustrasi SVG pengganti di katalog. Tambahkan foto asli di halaman tiap aset.
- Aset dilacak per jumlah, belum per unit bernomor seri.
- Belum ada: PDF buatan server (cetak memakai dialog browser), unggah foto bukti pasang, notifikasi WhatsApp atau email, dan pengembalian dana.
- Jejak audit hanya mencegah perubahan lewat aplikasi. Orang yang memegang berkas basis data di server tetap bisa mengubahnya, jadi salin cadangan secara berkala ke tempat yang dipegang kedua partner.
