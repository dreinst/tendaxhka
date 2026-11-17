// Mengisi basis data dengan DATA CONTOH untuk mencoba sistem di lokal. Isinya ada di src/lib/contoh.ts.
// Jalankan: npm run seed (tambah -- --timpa untuk mengosongkan dulu).
import { randomBytes } from "node:crypto";
import { AKUN_CONTOH, isiDataContoh, TABEL_DATA } from "../src/lib/contoh.ts";
import { jalankan, satu, transaksi, tutup } from "../src/lib/db.ts";

// Data contoh tidak boleh masuk ke server sungguhan: akunnya semua memakai satu kata sandi.
if (process.env.NODE_ENV === "production") {
  console.error("Seed ditolak karena NODE_ENV=production. Data contoh hanya untuk lokal.");
  process.exit(1);
}

// Seed biasanya untuk berkas SQLite lokal. Dengan --timpa isinya dikosongkan dulu, jadi PostgreSQL hanya diisi
// kalau diminta terang-terangan dengan SEED_POSTGRES=ya, misalnya untuk basis data demo atau uji.
if (process.env.DATABASE_URL?.trim() && process.env.SEED_POSTGRES !== "ya") {
  console.error("Seed ditolak karena DATABASE_URL terisi. Isi SEED_POSTGRES=ya kalau basis data itu memang untuk demo atau uji.");
  process.exit(1);
}

// Kata sandi dibuat acak setiap kali seed dijalankan, kecuali SANDI_CONTOH diisi (minimal 8 karakter).
const SANDI = (process.env.SANDI_CONTOH ?? "").length >= 8 ? process.env.SANDI_CONTOH! : randomBytes(6).toString("hex");

if (await satu("SELECT 1 FROM pengguna LIMIT 1")) {
  if (!process.argv.includes("--timpa")) {
    console.error("Basis data sudah berisi. Jalankan dengan -- --timpa untuk mengosongkan dan mengisi ulang.");
    process.exit(1);
  }
  await transaksi(async () => {
    for (const t of TABEL_DATA) await jalankan(`DELETE FROM ${t}`);
  });
}

await isiDataContoh(SANDI);
console.log(`Data contoh terisi. Akun: ${AKUN_CONTOH.join(", ")}. Kata sandi semuanya: ${SANDI}`);
// Koneksi ditutup supaya proses selesai.
await tutup();
