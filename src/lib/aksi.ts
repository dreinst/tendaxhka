"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { bukaSesi, terlaluSering, tutupSesi, wajib } from "./auth.ts";
import { ambilPesanan, barisPesanan, bulanTerkunci, kekurangan, kunciBulan, nomorBerikut, pengaturan, PENGATURAN_BAWAAN, type Aset } from "./data.ts";
import { jalankan, satu, semua, transaksi } from "./db.ts";
import { hariIni } from "./format.ts";
import { bacaChecklist, tambahHari, tanggalSah, type ButirChecklist } from "./hitung.ts";
import { cocokSandi, hashSandi } from "./sandi.ts";

// Galat yang pesannya boleh ditampilkan ke pengguna. Galat lain dibiarkan naik ke halaman error.
class Galat extends Error {}

function coba(fn: () => void): string | null {
  try {
    transaksi(fn);
    return null;
  } catch (e) {
    if (e instanceof Galat) return e.message;
    throw e;
  }
}

function gagal(jalur: string, pesan: string): never {
  redirect(`${jalur}${jalur.includes("?") ? "&" : "?"}galat=${encodeURIComponent(pesan)}`);
}

function teks(fd: FormData, kunci: string, maks = 200): string {
  return String(fd.get(kunci) ?? "").trim().slice(0, maks);
}

// Menerima "1.500.000" maupun "1500000".
function bulat(nilai: FormDataEntryValue | null): number {
  const n = parseInt(String(nilai ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function pilihan<T extends string>(nilai: string, daftar: readonly T[], bawaan: T): T {
  return (daftar as readonly string[]).includes(nilai) ? (nilai as T) : bawaan;
}

async function alamatIp(): Promise<string> {
  return (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "lokal";
}

function pastikanTerbuka(tanggal: string): void {
  if (bulanTerkunci(tanggal)) throw new Galat(`Bulan ${tanggal.slice(0, 7)} sudah ditutup. Buka periodenya dulu di Bagi Hasil.`);
}

// Masuk dan keluar

export async function masuk(fd: FormData): Promise<void> {
  const username = teks(fd, "username", 60).toLowerCase();
  const sandi = String(fd.get("sandi") ?? "");
  if (terlaluSering(`masuk:${await alamatIp()}:${username}`, 5, 15)) gagal("/masuk", "Terlalu banyak percobaan. Coba lagi 15 menit lagi.");

  // Basis data tanpa pengguna: formulir masuk membuat akun admin pertama.
  if (!satu("SELECT 1 FROM pengguna LIMIT 1")) {
    const nama = teks(fd, "nama", 80);
    if (!nama || !/^[a-z0-9._-]{3,30}$/.test(username) || sandi.length < 8) {
      gagal("/masuk", "Isi nama, username (3 sampai 30 huruf kecil atau angka), dan kata sandi minimal 8 karakter.");
    }
    const id = jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES (?, ?, ?, 'admin')", nama, username, hashSandi(sandi));
    await bukaSesi(id);
    redirect("/sistem");
  }

  const u = satu<{ id: number; sandi: string }>("SELECT id, sandi FROM pengguna WHERE username = ? AND aktif = 1", username);
  if (!u || !cocokSandi(sandi, u.sandi)) gagal("/masuk", "Username atau kata sandi salah.");
  await bukaSesi(u.id);
  redirect("/sistem");
}

export async function keluar(): Promise<void> {
  await tutupSesi();
  redirect("/masuk");
}

// Formulir publik di website

export async function kirimPermintaan(fd: FormData): Promise<void> {
  // Isian jebakan untuk bot. Manusia tidak melihatnya.
  if (teks(fd, "situs")) redirect("/?terkirim=1#kontak");
  if (terlaluSering(`permintaan:${await alamatIp()}`, 5, 60)) gagal("/#kontak", "Terlalu banyak kiriman. Coba lagi nanti atau hubungi kami lewat telepon.");
  const nama = teks(fd, "nama", 80);
  const telepon = teks(fd, "telepon", 30);
  if (!nama || !/^[\d+\s()-]{8,30}$/.test(telepon)) gagal("/#kontak", "Isi nama dan nomor telepon yang bisa dihubungi.");
  const tgl = teks(fd, "tanggal", 10);
  const rincian = [
    tanggalSah(tgl) ? `Tanggal acara: ${tgl}` : "",
    teks(fd, "lokasi", 200) && `Lokasi: ${teks(fd, "lokasi", 200)}`,
    teks(fd, "kebutuhan", 1000),
  ].filter(Boolean);
  jalankan(
    "INSERT INTO kontak (nama, perusahaan, telepon, sumber, kebutuhan, tindak_lanjut, dibuat) VALUES (?, ?, ?, 'website', ?, ?, ?)",
    nama,
    teks(fd, "perusahaan", 120),
    telepon,
    rincian.join("\n"),
    hariIni(),
    hariIni(),
  );
  redirect("/?terkirim=1#kontak");
}

// CRM

const TAHAP = ["baru", "dihubungi", "penawaran", "menang", "kalah"] as const;

export async function simpanKontak(fd: FormData): Promise<void> {
  await wajib("kontak.tulis");
  const id = bulat(fd.get("id"));
  const kembali = id ? `/sistem/kontak/${id}` : "/sistem/kontak";
  const nama = teks(fd, "nama", 80);
  if (!nama) gagal(kembali, "Nama wajib diisi.");
  const tl = teks(fd, "tindak_lanjut", 10);
  const isi = [
    nama,
    teks(fd, "perusahaan", 120),
    teks(fd, "telepon", 30),
    teks(fd, "email", 120),
    pilihan(teks(fd, "jenis"), ["perorangan", "korporat"], "perorangan"),
    teks(fd, "sumber", 60),
    pilihan(teks(fd, "tahap"), TAHAP, "baru"),
    teks(fd, "kebutuhan", 2000),
    tanggalSah(tl) ? tl : null,
  ];
  if (id) {
    jalankan(
      "UPDATE kontak SET nama = ?, perusahaan = ?, telepon = ?, email = ?, jenis = ?, sumber = ?, tahap = ?, kebutuhan = ?, tindak_lanjut = ? WHERE id = ?",
      ...isi,
      id,
    );
    redirect(kembali);
  }
  const baru = jalankan(
    "INSERT INTO kontak (nama, perusahaan, telepon, email, jenis, sumber, tahap, kebutuhan, tindak_lanjut, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ...isi,
    hariIni(),
  );
  redirect(`/sistem/kontak/${baru}`);
}

export async function ubahTahap(id: number, tahap: string): Promise<void> {
  await wajib("kontak.tulis");
  jalankan("UPDATE kontak SET tahap = ? WHERE id = ?", pilihan(tahap, TAHAP, "baru"), id);
  redirect("/sistem/kontak");
}

// Pesanan: penawaran, booking, pelaksanaan, faktur

export async function simpanPesanan(fd: FormData): Promise<void> {
  await wajib("pesanan.tulis");
  let id = bulat(fd.get("id"));
  const kontakId = bulat(fd.get("kontak_id"));
  const kembali = id ? `/sistem/pesanan/${id}` : `/sistem/pesanan/baru?kontak=${kontakId}`;
  const acara = teks(fd, "acara", 160);
  const mulai = teks(fd, "mulai", 10);
  const selesai = teks(fd, "selesai", 10);
  const diskon = Math.max(0, bulat(fd.get("diskon")));
  if (!satu("SELECT 1 FROM kontak WHERE id = ?", kontakId)) gagal(kembali, "Pilih pelanggan dulu.");
  if (!acara) gagal(kembali, "Nama acara wajib diisi.");
  if (!tanggalSah(mulai) || !tanggalSah(selesai) || selesai < mulai) gagal(kembali, "Tanggal pasang dan bongkar tidak sah.");

  const aset = new Map(semua<Aset>("SELECT * FROM aset").map((a) => [a.id, a]));
  const kolom = (k: string) => fd.getAll(k);
  const [bAset, bDesk, bJumlah, bHari, bHarga] = ["b_aset", "b_deskripsi", "b_jumlah", "b_hari", "b_harga"].map(kolom);
  const baris: { asetId: number | null; deskripsi: string; jumlah: number; hari: number; harga: number }[] = [];
  bAset.forEach((nilai, i) => {
    const a = aset.get(bulat(nilai));
    const jumlah = bulat(bJumlah[i]);
    const deskripsi = String(bDesk[i] ?? "").trim().slice(0, 200) || (a ? [a.nama, a.ukuran].filter(Boolean).join(" ") : "");
    if (jumlah <= 0 || !deskripsi) return;
    const hargaIsi = String(bHarga[i] ?? "").trim();
    baris.push({
      asetId: a?.id ?? null,
      deskripsi,
      jumlah,
      hari: Math.max(1, bulat(bHari[i])),
      harga: hargaIsi === "" ? (a?.harga ?? 0) : Math.max(0, bulat(hargaIsi)),
    });
  });
  if (baris.length === 0) gagal(kembali, "Isi minimal satu baris dengan jumlah lebih dari nol.");

  const galat = coba(() => {
    if (id) {
      const lama = satu<{ status: string }>("SELECT status FROM pesanan WHERE id = ?", id);
      if (!lama) throw new Galat("Pesanan tidak ditemukan.");
      if (lama.status === "selesai" || lama.status === "batal") throw new Galat("Pesanan yang sudah selesai atau batal tidak bisa diubah.");
      jalankan(
        "UPDATE pesanan SET kontak_id = ?, acara = ?, lokasi = ?, mulai = ?, selesai = ?, diskon = ?, catatan = ? WHERE id = ?",
        kontakId,
        acara,
        teks(fd, "lokasi", 300),
        mulai,
        selesai,
        diskon,
        teks(fd, "catatan", 2000),
        id,
      );
      jalankan("DELETE FROM pesanan_baris WHERE pesanan_id = ?", id);
    } else {
      const hari = hariIni();
      id = jalankan(
        "INSERT INTO pesanan (nomor, kontak_id, acara, lokasi, mulai, selesai, diskon, catatan, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        nomorBerikut(hari),
        kontakId,
        acara,
        teks(fd, "lokasi", 300),
        mulai,
        selesai,
        diskon,
        teks(fd, "catatan", 2000),
        hari,
      );
      jalankan("UPDATE kontak SET tahap = 'penawaran' WHERE id = ? AND tahap IN ('baru', 'dihubungi')", kontakId);
    }
    for (const b of baris) {
      jalankan(
        "INSERT INTO pesanan_baris (pesanan_id, aset_id, deskripsi, jumlah, hari, harga) VALUES (?, ?, ?, ?, ?, ?)",
        id,
        b.asetId,
        b.deskripsi,
        b.jumlah,
        b.hari,
        b.harga,
      );
    }
    // Pesanan yang sudah mengunci aset tidak boleh diubah sampai melebihi stok di tanggalnya.
    const status = satu<{ status: string }>("SELECT status FROM pesanan WHERE id = ?", id)!.status;
    if (status === "booking" || status === "berjalan") {
      const kurang = kekurangan(id);
      if (kurang.length) throw new Galat(`Aset tidak cukup di tanggal itu. ${kurang.join("; ")}.`);
    }
  });
  if (galat) gagal(kembali, galat);
  redirect(`/sistem/pesanan/${id}`);
}

const JALUR_STATUS: Record<string, string[]> = {
  penawaran: ["booking", "batal"],
  booking: ["berjalan", "penawaran", "batal"],
  berjalan: ["selesai"],
  selesai: [],
  batal: ["penawaran"],
};

function butirBawaan(jenis: string): string {
  const s = pengaturan();
  const sumber = jenis === "pasang" ? s.checklist_pasang : jenis === "bongkar" ? s.checklist_bongkar : "";
  const butir: ButirChecklist[] = sumber.split("\n").map((t) => t.trim()).filter(Boolean).map((t) => ({ teks: t, beres: false }));
  return JSON.stringify(butir);
}

export async function ubahStatus(id: number, tujuan: string): Promise<void> {
  await wajib("pesanan.tulis");
  const kembali = `/sistem/pesanan/${id}`;
  const galat = coba(() => {
    const p = ambilPesanan(id);
    if (!p) throw new Galat("Pesanan tidak ditemukan.");
    if (!JALUR_STATUS[p.status]?.includes(tujuan)) throw new Galat("Perubahan status itu tidak diizinkan.");
    if (tujuan === "batal" && p.dibayar > 0) throw new Galat("Pesanan ini sudah menerima pembayaran. Hapus pembayarannya dulu sebelum membatalkan.");
    if (tujuan === "booking") {
      const kurang = kekurangan(id);
      if (kurang.length) throw new Galat(`Belum bisa dibooking, aset tidak cukup. ${kurang.join("; ")}.`);
      // Jadwal pasang dan bongkar dibuat sekali, lengkap dengan checklist bawaan.
      if (!satu("SELECT 1 FROM tugas WHERE pesanan_id = ?", id)) {
        for (const [jenis, tgl] of [["pasang", p.mulai], ["bongkar", p.selesai]]) {
          jalankan("INSERT INTO tugas (pesanan_id, jenis, tanggal, checklist) VALUES (?, ?, ?, ?)", id, jenis, tgl, butirBawaan(jenis));
        }
      }
      jalankan("UPDATE kontak SET tahap = 'menang' WHERE id = ?", p.kontak_id);
    }
    if (tujuan === "selesai" && !p.tgl_faktur) {
      pastikanTerbuka(hariIni());
      jalankan("UPDATE pesanan SET tgl_faktur = ? WHERE id = ?", hariIni(), id);
    }
    jalankan("UPDATE pesanan SET status = ? WHERE id = ?", tujuan, id);
  });
  if (galat) gagal(kembali, galat);
  redirect(kembali);
}

export async function terbitkanFaktur(id: number): Promise<void> {
  await wajib("pesanan.tulis");
  const kembali = `/sistem/pesanan/${id}`;
  const galat = coba(() => {
    const p = ambilPesanan(id);
    if (!p || p.status === "penawaran" || p.status === "batal") throw new Galat("Faktur hanya bisa terbit untuk pesanan yang sudah dibooking.");
    if (p.tgl_faktur) throw new Galat("Faktur sudah terbit.");
    pastikanTerbuka(hariIni());
    jalankan("UPDATE pesanan SET tgl_faktur = ? WHERE id = ?", hariIni(), id);
  });
  if (galat) gagal(kembali, galat);
  redirect(kembali);
}

// Menyalin pesanan menjadi penawaran baru di tanggal lain, untuk pelanggan yang memesan berulang.
export async function duplikatPesanan(id: number, fd: FormData): Promise<void> {
  await wajib("pesanan.tulis");
  const mulai = teks(fd, "mulai", 10);
  const p = ambilPesanan(id);
  if (!p) gagal("/sistem/pesanan", "Pesanan tidak ditemukan.");
  if (!tanggalSah(mulai)) gagal(`/sistem/pesanan/${id}`, "Isi tanggal pasang untuk pesanan baru.");
  const lama = Math.round((Date.parse(p.selesai) - Date.parse(p.mulai)) / 864e5);
  let baru = 0;
  transaksi(() => {
    const hari = hariIni();
    baru = jalankan(
      "INSERT INTO pesanan (nomor, kontak_id, acara, lokasi, mulai, selesai, diskon, catatan, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      nomorBerikut(hari),
      p.kontak_id,
      p.acara,
      p.lokasi,
      mulai,
      tambahHari(mulai, lama),
      p.diskon,
      p.catatan,
      hari,
    );
    for (const b of barisPesanan(id)) {
      jalankan(
        "INSERT INTO pesanan_baris (pesanan_id, aset_id, deskripsi, jumlah, hari, harga) VALUES (?, ?, ?, ?, ?, ?)",
        baru,
        b.aset_id,
        b.deskripsi,
        b.jumlah,
        b.hari,
        b.harga,
      );
    }
  });
  redirect(`/sistem/pesanan/${baru}`);
}

export async function hapusPesanan(id: number): Promise<void> {
  await wajib("pesanan.tulis");
  const galat = coba(() => {
    const p = ambilPesanan(id);
    if (!p) throw new Galat("Pesanan tidak ditemukan.");
    if (p.status !== "penawaran" && p.status !== "batal") throw new Galat("Hanya penawaran atau pesanan batal yang bisa dihapus.");
    if (p.dibayar > 0) throw new Galat("Pesanan ini punya pembayaran.");
    jalankan("DELETE FROM pesanan WHERE id = ?", id);
  });
  if (galat) gagal(`/sistem/pesanan/${id}`, galat);
  redirect("/sistem/pesanan");
}

// Uang masuk dan biaya

export async function tambahPembayaran(pesananId: number, fd: FormData): Promise<void> {
  await wajib("pesanan.tulis");
  const kembali = `/sistem/pesanan/${pesananId}`;
  const tgl = teks(fd, "tanggal", 10);
  const jumlah = bulat(fd.get("jumlah"));
  const galat = coba(() => {
    const p = ambilPesanan(pesananId);
    if (!p || p.status === "penawaran" || p.status === "batal") throw new Galat("Pembayaran hanya untuk pesanan yang sudah dibooking.");
    if (!tanggalSah(tgl) || jumlah <= 0) throw new Galat("Isi tanggal dan jumlah pembayaran.");
    if (jumlah > p.sisa) throw new Galat("Jumlah melebihi sisa tagihan.");
    pastikanTerbuka(tgl);
    jalankan(
      "INSERT INTO pembayaran (pesanan_id, tanggal, jumlah, metode, catatan) VALUES (?, ?, ?, ?, ?)",
      pesananId,
      tgl,
      jumlah,
      pilihan(teks(fd, "metode"), ["transfer", "tunai", "lainnya"], "transfer"),
      teks(fd, "catatan", 200),
    );
  });
  if (galat) gagal(kembali, galat);
  redirect(kembali);
}

export async function hapusPembayaran(id: number): Promise<void> {
  await wajib("keuangan.tulis");
  const b = satu<{ pesanan_id: number; tanggal: string }>("SELECT pesanan_id, tanggal FROM pembayaran WHERE id = ?", id);
  if (!b) redirect("/sistem/pesanan");
  const kembali = `/sistem/pesanan/${b.pesanan_id}`;
  const galat = coba(() => {
    pastikanTerbuka(b.tanggal);
    jalankan("DELETE FROM pembayaran WHERE id = ?", id);
  });
  if (galat) gagal(kembali, galat);
  redirect(kembali);
}

export async function tambahBiaya(fd: FormData): Promise<void> {
  await wajib("keuangan.tulis");
  const pesananId = bulat(fd.get("pesanan_id"));
  const tgl = teks(fd, "tanggal", 10);
  const kembali = pesananId ? `/sistem/pesanan/${pesananId}` : `/sistem/keuangan?bulan=${tgl.slice(0, 7)}`;
  const jumlah = bulat(fd.get("jumlah"));
  const kategori = teks(fd, "kategori", 60);
  const galat = coba(() => {
    if (!tanggalSah(tgl) || jumlah <= 0 || !kategori) throw new Galat("Isi tanggal, kategori, dan jumlah biaya.");
    if (pesananId && !satu("SELECT 1 FROM pesanan WHERE id = ?", pesananId)) throw new Galat("Pesanan tidak ditemukan.");
    pastikanTerbuka(tgl);
    jalankan(
      "INSERT INTO biaya (tanggal, jenis, kategori, pesanan_id, jumlah, keterangan) VALUES (?, ?, ?, ?, ?, ?)",
      tgl,
      pesananId ? "langsung" : "operasional",
      kategori,
      pesananId || null,
      jumlah,
      teks(fd, "keterangan", 300),
    );
  });
  if (galat) gagal(tanggalSah(tgl) ? kembali : "/sistem/keuangan", galat);
  redirect(kembali);
}

export async function hapusBiaya(id: number): Promise<void> {
  await wajib("keuangan.tulis");
  const b = satu<{ pesanan_id: number | null; tanggal: string }>("SELECT pesanan_id, tanggal FROM biaya WHERE id = ?", id);
  if (!b) redirect("/sistem/keuangan");
  const kembali = b.pesanan_id ? `/sistem/pesanan/${b.pesanan_id}` : `/sistem/keuangan?bulan=${b.tanggal.slice(0, 7)}`;
  const galat = coba(() => {
    pastikanTerbuka(b.tanggal);
    jalankan("DELETE FROM biaya WHERE id = ?", id);
  });
  if (galat) gagal(kembali, galat);
  redirect(kembali);
}

// Aset dan perawatan

export async function simpanAset(fd: FormData): Promise<void> {
  await wajib("aset.tulis");
  const id = bulat(fd.get("id"));
  const kembali = id ? `/sistem/aset/${id}` : "/sistem/aset";
  const kode = teks(fd, "kode", 20).toUpperCase();
  const nama = teks(fd, "nama", 120);
  const kategori = teks(fd, "kategori", 60);
  if (!kode || !nama || !kategori) gagal(kembali, "Kode, nama, dan kategori wajib diisi.");
  if (satu("SELECT 1 FROM aset WHERE kode = ? AND id <> ?", kode, id)) gagal(kembali, `Kode ${kode} sudah dipakai aset lain.`);
  const isi = [
    kode,
    nama,
    kategori,
    teks(fd, "ukuran", 40),
    teks(fd, "satuan", 20) || "unit",
    Math.max(0, bulat(fd.get("jumlah"))),
    Math.max(0, bulat(fd.get("harga"))),
    teks(fd, "deskripsi", 300),
    fd.get("tampil_web") ? 1 : 0,
    fd.get("aktif") ? 1 : 0,
  ];
  if (id) {
    jalankan(
      "UPDATE aset SET kode = ?, nama = ?, kategori = ?, ukuran = ?, satuan = ?, jumlah = ?, harga = ?, deskripsi = ?, tampil_web = ?, aktif = ? WHERE id = ?",
      ...isi,
      id,
    );
  } else {
    jalankan(
      "INSERT INTO aset (kode, nama, kategori, ukuran, satuan, jumlah, harga, deskripsi, tampil_web, aktif) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ...isi,
    );
  }
  redirect("/sistem/aset");
}

export async function tambahPerawatan(asetId: number, fd: FormData): Promise<void> {
  await wajib("aset.tulis");
  const kembali = `/sistem/aset/${asetId}`;
  const jumlah = bulat(fd.get("jumlah"));
  const mulai = teks(fd, "mulai", 10);
  const a = satu<Aset>("SELECT * FROM aset WHERE id = ?", asetId);
  if (!a || jumlah <= 0 || jumlah > a.jumlah || !tanggalSah(mulai)) gagal(kembali, "Isi jumlah unit (tidak lebih dari total) dan tanggal mulai.");
  jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai, catatan) VALUES (?, ?, ?, ?)", asetId, jumlah, mulai, teks(fd, "catatan", 300));
  redirect(kembali);
}

export async function selesaiPerawatan(id: number): Promise<void> {
  await wajib("aset.tulis");
  const r = satu<{ aset_id: number; mulai: string }>("SELECT aset_id, mulai FROM perawatan WHERE id = ?", id);
  if (!r) redirect("/sistem/aset");
  const hari = hariIni();
  jalankan("UPDATE perawatan SET selesai = ? WHERE id = ?", hari < r.mulai ? r.mulai : hari, id);
  redirect(`/sistem/aset/${r.aset_id}`);
}

// Jadwal dan checklist

export async function simpanTugas(pesananId: number, fd: FormData): Promise<void> {
  await wajib("jadwal.tulis");
  const kembali = `/sistem/pesanan/${pesananId}`;
  const id = bulat(fd.get("id"));
  const tgl = teks(fd, "tanggal", 10);
  const jenis = pilihan(teks(fd, "jenis"), ["survei", "pasang", "bongkar", "lainnya"], "lainnya");
  if (!tanggalSah(tgl)) gagal(kembali, "Isi tanggal tugas.");
  const kru = teks(fd, "kru", 200);
  if (id) {
    // Butir yang teksnya tidak berubah tetap membawa tanda beresnya.
    const lama = satu<{ checklist: string }>("SELECT checklist FROM tugas WHERE id = ? AND pesanan_id = ?", id, pesananId);
    if (!lama) gagal(kembali, "Tugas tidak ditemukan.");
    const beres = new Set(bacaChecklist(lama.checklist).filter((b) => b.beres).map((b) => b.teks));
    const butir = teks(fd, "butir", 3000).split("\n").map((t) => t.trim()).filter(Boolean).map((t) => ({ teks: t, beres: beres.has(t) }));
    jalankan("UPDATE tugas SET jenis = ?, tanggal = ?, kru = ?, checklist = ? WHERE id = ?", jenis, tgl, kru, JSON.stringify(butir), id);
  } else {
    jalankan("INSERT INTO tugas (pesanan_id, jenis, tanggal, kru, checklist) VALUES (?, ?, ?, ?, ?)", pesananId, jenis, tgl, kru, butirBawaan(jenis));
  }
  redirect(kembali);
}

export async function hapusTugas(id: number): Promise<void> {
  await wajib("jadwal.tulis");
  const t = satu<{ pesanan_id: number }>("SELECT pesanan_id FROM tugas WHERE id = ?", id);
  jalankan("DELETE FROM tugas WHERE id = ?", id);
  redirect(t ? `/sistem/pesanan/${t.pesanan_id}` : "/sistem/jadwal");
}

export async function centangTugas(id: number, fd: FormData): Promise<void> {
  await wajib("jadwal.centang");
  const t = satu<{ checklist: string }>("SELECT checklist FROM tugas WHERE id = ?", id);
  if (!t) redirect("/sistem/jadwal");
  const dicentang = new Set(fd.getAll("butir").map(String));
  const butir = bacaChecklist(t.checklist).map((b, i) => ({ ...b, beres: dicentang.has(String(i)) }));
  jalankan(
    "UPDATE tugas SET checklist = ?, selesai = ?, catatan = ? WHERE id = ?",
    JSON.stringify(butir),
    fd.get("selesai") ? 1 : 0,
    teks(fd, "catatan", 500),
    id,
  );
  redirect(`/sistem/jadwal#tugas-${id}`);
}

// Tutup periode dan bagi hasil

export async function kunciPeriode(bulan: string): Promise<void> {
  await wajib("keuangan.tulis");
  const galat = coba(() => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(bulan) || bulan > hariIni().slice(0, 7)) throw new Galat("Bulan itu belum bisa ditutup.");
    if (bulanTerkunci(`${bulan}-01`)) throw new Galat("Bulan itu sudah ditutup.");
    kunciBulan(bulan, new Date().toISOString());
  });
  if (galat) gagal("/sistem/bagi-hasil", galat);
  redirect("/sistem/bagi-hasil");
}

export async function bukaPeriode(bulan: string): Promise<void> {
  await wajib("keuangan.tulis");
  const p = satu<{ dibayar_tenda: number; dibayar_hka: number }>("SELECT dibayar_tenda, dibayar_hka FROM periode WHERE bulan = ?", bulan);
  if (p && (p.dibayar_tenda > 0 || p.dibayar_hka > 0)) gagal("/sistem/bagi-hasil", "Periode ini sudah punya pembayaran ke partner. Nolkan dulu sebelum dibuka.");
  jalankan("DELETE FROM periode WHERE bulan = ?", bulan);
  redirect("/sistem/bagi-hasil");
}

export async function catatBayarPartner(bulan: string, fd: FormData): Promise<void> {
  await wajib("keuangan.tulis");
  jalankan(
    "UPDATE periode SET dibayar_tenda = ?, dibayar_hka = ?, catatan = ? WHERE bulan = ?",
    Math.max(0, bulat(fd.get("dibayar_tenda"))),
    Math.max(0, bulat(fd.get("dibayar_hka"))),
    teks(fd, "catatan", 300),
    bulan,
  );
  redirect("/sistem/bagi-hasil");
}

// Pengaturan dan pengguna

export async function simpanPengaturan(fd: FormData): Promise<void> {
  await wajib("pengaturan");
  const angka = (k: string, maks: number) => String(Math.min(maks, Math.max(0, Number(teks(fd, k, 10).replace(",", ".")) || 0)));
  const isi: Record<keyof typeof PENGATURAN_BAWAAN, string> = {
    nama_usaha: teks(fd, "nama_usaha", 80) || PENGATURAN_BAWAAN.nama_usaha,
    telepon: teks(fd, "telepon", 30),
    email: teks(fd, "email", 120),
    alamat: teks(fd, "alamat", 300),
    rekening: teks(fd, "rekening", 200),
    basis: pilihan(teks(fd, "basis"), ["kas", "akrual"], "kas"),
    persen_cadangan: angka("persen_cadangan", 100),
    persen_pajak: angka("persen_pajak", 100),
    porsi_tenda: angka("porsi_tenda", 100),
    checklist_pasang: teks(fd, "checklist_pasang", 3000),
    checklist_bongkar: teks(fd, "checklist_bongkar", 3000),
  };
  transaksi(() => {
    for (const [k, v] of Object.entries(isi)) {
      jalankan("INSERT INTO pengaturan (kunci, nilai) VALUES (?, ?) ON CONFLICT (kunci) DO UPDATE SET nilai = excluded.nilai", k, v);
    }
  });
  redirect("/sistem/pengaturan?ok=1");
}

export async function simpanPengguna(fd: FormData): Promise<void> {
  const saya = await wajib("pengaturan");
  const kembali = "/sistem/pengaturan";
  const id = bulat(fd.get("id"));
  const nama = teks(fd, "nama", 80);
  const username = teks(fd, "username", 30).toLowerCase();
  const peran = pilihan(teks(fd, "peran"), ["admin", "sales", "gudang", "kru", "partner"], "kru");
  const sandi = String(fd.get("sandi") ?? "");
  const aktif = fd.get("aktif") ? 1 : 0;
  if (!nama || !/^[a-z0-9._-]{3,30}$/.test(username)) gagal(kembali, "Isi nama dan username (3 sampai 30 huruf kecil atau angka).");
  if (satu("SELECT 1 FROM pengguna WHERE username = ? AND id <> ?", username, id)) gagal(kembali, "Username sudah dipakai.");
  if ((!id || sandi) && sandi.length < 8) gagal(kembali, "Kata sandi minimal 8 karakter.");
  if (id === saya.id && (peran !== "admin" || !aktif)) gagal(kembali, "Peran dan status akun sendiri tidak bisa diubah dari sini.");
  if (id) {
    jalankan("UPDATE pengguna SET nama = ?, username = ?, peran = ?, aktif = ? WHERE id = ?", nama, username, peran, aktif, id);
    if (sandi) {
      // Ganti kata sandi atau menonaktifkan akun mencabut semua sesinya.
      jalankan("UPDATE pengguna SET sandi = ? WHERE id = ?", hashSandi(sandi), id);
      if (id !== saya.id) jalankan("DELETE FROM sesi WHERE pengguna_id = ?", id);
    }
    if (!aktif) jalankan("DELETE FROM sesi WHERE pengguna_id = ?", id);
  } else {
    jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES (?, ?, ?, ?)", nama, username, hashSandi(sandi), peran);
  }
  redirect(`${kembali}?ok=1`);
}
