-- Skema sistem internal Tenda Indonesia x HKA Management.
-- SQLite satu berkas. Uang disimpan sebagai rupiah bulat (INTEGER), tanggal sebagai teks YYYY-MM-DD.
-- Berkas ini dijalankan setiap kali basis data dibuka, jadi semua perintah harus aman diulang.

CREATE TABLE IF NOT EXISTS pengguna (
  id INTEGER PRIMARY KEY,
  nama TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  sandi TEXT NOT NULL,
  peran TEXT NOT NULL CHECK (peran IN ('admin', 'sales', 'gudang', 'kru', 'partner')),
  aktif INTEGER NOT NULL DEFAULT 1
);

-- kedaluwarsa bergeser maju setiap kali sesi dipakai (batas tidak aktif). batas adalah umur maksimal sesi
-- sejak masuk dan tidak pernah bergeser. Basis data lama mendapat kolom batas lewat src/lib/db.ts.
CREATE TABLE IF NOT EXISTS sesi (
  token TEXT PRIMARY KEY,
  pengguna_id INTEGER NOT NULL REFERENCES pengguna (id) ON DELETE CASCADE,
  kedaluwarsa TEXT NOT NULL,
  batas TEXT
);

CREATE TABLE IF NOT EXISTS pengaturan (
  kunci TEXT PRIMARY KEY,
  nilai TEXT NOT NULL
);

-- Aset dilacak per jumlah, misalnya 12 unit tenda sarnafil 5x5. Harga adalah harga sewa per satuan per hari.
CREATE TABLE IF NOT EXISTS aset (
  id INTEGER PRIMARY KEY,
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL,
  ukuran TEXT NOT NULL DEFAULT '',
  satuan TEXT NOT NULL DEFAULT 'unit',
  jumlah INTEGER NOT NULL CHECK (jumlah >= 0),
  harga INTEGER NOT NULL DEFAULT 0 CHECK (harga >= 0),
  deskripsi TEXT NOT NULL DEFAULT '',
  tampil_web INTEGER NOT NULL DEFAULT 1,
  aktif INTEGER NOT NULL DEFAULT 1
);

-- Unit yang sedang diperbaiki tidak bisa disewakan sampai kolom selesai diisi.
CREATE TABLE IF NOT EXISTS perawatan (
  id INTEGER PRIMARY KEY,
  aset_id INTEGER NOT NULL REFERENCES aset (id) ON DELETE CASCADE,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  mulai TEXT NOT NULL,
  selesai TEXT,
  catatan TEXT NOT NULL DEFAULT ''
);

-- Satu tabel untuk lead dan pelanggan. Tahap menunjukkan posisinya di pipeline.
CREATE TABLE IF NOT EXISTS kontak (
  id INTEGER PRIMARY KEY,
  nama TEXT NOT NULL,
  perusahaan TEXT NOT NULL DEFAULT '',
  telepon TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  jenis TEXT NOT NULL DEFAULT 'perorangan' CHECK (jenis IN ('perorangan', 'korporat')),
  sumber TEXT NOT NULL DEFAULT '',
  tahap TEXT NOT NULL DEFAULT 'baru' CHECK (tahap IN ('baru', 'dihubungi', 'penawaran', 'menang', 'kalah')),
  kebutuhan TEXT NOT NULL DEFAULT '',
  tindak_lanjut TEXT,
  dibuat TEXT NOT NULL
);

-- Satu baris pesanan berjalan dari penawaran sampai selesai. Rentang mulai sampai selesai (dari pasang
-- sampai bongkar) adalah masa aset dipesan.
CREATE TABLE IF NOT EXISTS pesanan (
  id INTEGER PRIMARY KEY,
  nomor TEXT NOT NULL UNIQUE,
  kontak_id INTEGER NOT NULL REFERENCES kontak (id),
  acara TEXT NOT NULL,
  lokasi TEXT NOT NULL DEFAULT '',
  mulai TEXT NOT NULL,
  selesai TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'penawaran' CHECK (status IN ('penawaran', 'booking', 'berjalan', 'selesai', 'batal')),
  diskon INTEGER NOT NULL DEFAULT 0 CHECK (diskon >= 0),
  catatan TEXT NOT NULL DEFAULT '',
  tgl_faktur TEXT,
  dibuat TEXT NOT NULL,
  CHECK (selesai >= mulai)
);

-- aset_id kosong berarti baris jasa atau biaya lain, misalnya transport dan pasang.
CREATE TABLE IF NOT EXISTS pesanan_baris (
  id INTEGER PRIMARY KEY,
  pesanan_id INTEGER NOT NULL REFERENCES pesanan (id) ON DELETE CASCADE,
  aset_id INTEGER REFERENCES aset (id),
  deskripsi TEXT NOT NULL,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  hari INTEGER NOT NULL DEFAULT 1 CHECK (hari > 0),
  harga INTEGER NOT NULL CHECK (harga >= 0)
);

CREATE TABLE IF NOT EXISTS pembayaran (
  id INTEGER PRIMARY KEY,
  pesanan_id INTEGER NOT NULL REFERENCES pesanan (id) ON DELETE CASCADE,
  tanggal TEXT NOT NULL,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  metode TEXT NOT NULL DEFAULT 'transfer',
  catatan TEXT NOT NULL DEFAULT ''
);

-- Biaya langsung menempel ke satu pesanan. Biaya operasional tidak punya pesanan.
CREATE TABLE IF NOT EXISTS biaya (
  id INTEGER PRIMARY KEY,
  tanggal TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('langsung', 'operasional')),
  kategori TEXT NOT NULL,
  pesanan_id INTEGER REFERENCES pesanan (id) ON DELETE SET NULL,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  keterangan TEXT NOT NULL DEFAULT ''
);

-- Checklist disimpan sebagai JSON: [{"teks": "...", "beres": false}].
CREATE TABLE IF NOT EXISTS tugas (
  id INTEGER PRIMARY KEY,
  pesanan_id INTEGER NOT NULL REFERENCES pesanan (id) ON DELETE CASCADE,
  jenis TEXT NOT NULL CHECK (jenis IN ('survei', 'pasang', 'bongkar', 'lainnya')),
  tanggal TEXT NOT NULL,
  kru TEXT NOT NULL DEFAULT '',
  checklist TEXT NOT NULL DEFAULT '[]',
  selesai INTEGER NOT NULL DEFAULT 0,
  catatan TEXT NOT NULL DEFAULT ''
);

-- Angka bagi hasil dibekukan di sini saat satu bulan ditutup.
CREATE TABLE IF NOT EXISTS periode (
  bulan TEXT PRIMARY KEY,
  pendapatan INTEGER NOT NULL,
  biaya_langsung INTEGER NOT NULL,
  biaya_operasional INTEGER NOT NULL,
  cadangan INTEGER NOT NULL,
  pajak INTEGER NOT NULL,
  laba_bersih INTEGER NOT NULL,
  bagian_tenda INTEGER NOT NULL,
  bagian_hka INTEGER NOT NULL,
  dibayar_tenda INTEGER NOT NULL DEFAULT 0,
  dibayar_hka INTEGER NOT NULL DEFAULT 0,
  dikunci TEXT NOT NULL,
  catatan TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_pesanan_rentang ON pesanan (mulai, selesai);
CREATE INDEX IF NOT EXISTS idx_pesanan_kontak ON pesanan (kontak_id);
CREATE INDEX IF NOT EXISTS idx_baris_pesanan ON pesanan_baris (pesanan_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_tanggal ON pembayaran (tanggal);
CREATE INDEX IF NOT EXISTS idx_biaya_tanggal ON biaya (tanggal);
CREATE INDEX IF NOT EXISTS idx_tugas_tanggal ON tugas (tanggal);

-- Jejak audit: siapa mengubah apa. Waktu dalam WIB (YYYY-MM-DD HH:MM:SS). Nama pengguna disalin supaya
-- catatan tetap terbaca walau akunnya nanti diubah. Pemicu di bawah menolak UPDATE dan DELETE, jadi
-- catatan hanya bisa bertambah lewat aplikasi.
CREATE TABLE IF NOT EXISTS log_aktivitas (
  id INTEGER PRIMARY KEY,
  waktu TEXT NOT NULL,
  pengguna_id INTEGER,
  pengguna TEXT NOT NULL,
  aksi TEXT NOT NULL,
  rincian TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_log_waktu ON log_aktivitas (waktu);

CREATE TRIGGER IF NOT EXISTS log_aktivitas_tanpa_ubah BEFORE UPDATE ON log_aktivitas
BEGIN
  SELECT RAISE(ABORT, 'Jejak audit tidak bisa diubah.');
END;

CREATE TRIGGER IF NOT EXISTS log_aktivitas_tanpa_hapus BEFORE DELETE ON log_aktivitas
BEGIN
  SELECT RAISE(ABORT, 'Jejak audit tidak bisa dihapus.');
END;
