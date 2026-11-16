// Mengisi basis data dengan DATA CONTOH untuk mencoba sistem di lokal. Isinya ada di src/lib/contoh.ts.
// Jalankan: npm run seed (tambah -- --timpa untuk mengosongkan dulu).
import { randomBytes } from "node:crypto";
import { AKUN_CONTOH, isiDataContoh, TABEL_DATA } from "../src/lib/contoh.ts";
import { jalankan, satu, transaksi } from "../src/lib/db.ts";

// Data contoh tidak boleh masuk ke server sungguhan: akunnya semua memakai satu kata sandi.
if (process.env.NODE_ENV === "production") {
  console.error("Seed ditolak karena NODE_ENV=production. Data contoh hanya untuk lokal.");
  process.exit(1);
}

// Kata sandi dibuat acak setiap kali seed dijalankan, kecuali SANDI_CONTOH diisi (minimal 8 karakter).
const SANDI = (process.env.SANDI_CONTOH ?? "").length >= 8 ? process.env.SANDI_CONTOH! : randomBytes(6).toString("hex");

if (satu("SELECT 1 FROM pengguna LIMIT 1")) {
  if (!process.argv.includes("--timpa")) {
    console.error("Basis data sudah berisi. Jalankan dengan -- --timpa untuk mengosongkan dan mengisi ulang.");
    process.exit(1);
  }
  transaksi(() => TABEL_DATA.forEach((t) => jalankan(`DELETE FROM ${t}`)));
}

isiDataContoh(SANDI);
console.log(`Data contoh terisi. Akun: ${AKUN_CONTOH.join(", ")}. Kata sandi semuanya: ${SANDI}`);
