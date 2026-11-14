# Catatan perubahan branch perbaikan-review

Perbaikan hasil review keamanan dan logika atas draf awal (commit `b3faf4f`). Setiap bagian di bawah sama dengan satu commit, urut dari yang paling mendesak.

## 1. Admin pertama butuh kode penyiapan

Masalah: saat basis data kosong, siapa pun yang pertama membuka `/masuk` bisa membuat akun admin. Kalau situs sudah online sebelum pemilik sempat membuat akun, orang asing bisa menguasai sistem.

Perubahan:

- Formulir admin pertama sekarang meminta kode yang sama dengan `SETUP_TOKEN` di `.env`. Kode minimal 16 karakter. Kalau `SETUP_TOKEN` kosong, formulir selalu menolak.
- Kode dibandingkan dengan `samaAman()` di `src/lib/sandi.ts` supaya waktu responsnya tidak membocorkan isi kode.
- `.env.example` dan README menjelaskan cara membuat kodenya.

Yang perlu dilakukan: isi `SETUP_TOKEN` di `.env` server sebelum deploy. Setelah admin pertama dibuat, kode ini tidak dipakai lagi.
