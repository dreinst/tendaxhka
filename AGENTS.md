# Aturan proyek Tenda Indonesia

Website dan sistem internal rental tenda, kerja sama Tenda Indonesia dan HKA Management. Baca `README.md` dulu.

- Versi Next.js di proyek ini punya perubahan besar dari versi lama. Baca panduan di `node_modules/next/dist/docs/` sebelum menulis kode.
- Semua teks (UI, komentar, dokumentasi, commit) berbahasa Indonesia dan mengikuti skill `humanizer`. Jangan pakai em dash, en dash, atau `--` sebagai tanda pisah dalam prosa.
- Jangan tambahkan atribusi AI di commit, PR, atau komentar.
- Jangan deploy tanpa persetujuan pemilik proyek. Jalankan di lokal.
- Basis data sengaja ringan: satu berkas SQLite lewat `node:sqlite`, tanpa ORM. Skema ada di `db/skema.sql` dan harus aman dijalankan berulang.
- Hitungan (ketersediaan, total, bagi hasil, hak akses) tinggal di `src/lib/hitung.ts` tanpa akses basis data, supaya bisa diuji.
- Setiap halaman sistem dan setiap aksi server memanggil `wajib()` lebih dulu. Menu hanya menyembunyikan tautan.
- Uang disimpan sebagai rupiah bulat. Tanggal disimpan sebagai teks `YYYY-MM-DD`.
- `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run build` harus lulus sebelum perubahan dianggap selesai.
