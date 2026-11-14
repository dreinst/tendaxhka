# Catatan perubahan branch perbaikan-review

Perbaikan hasil review keamanan dan logika atas draf awal (commit `b3faf4f`). Setiap bagian di bawah sama dengan satu commit, urut dari yang paling mendesak.

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
