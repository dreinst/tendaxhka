"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { alamatIp, bukaSesi, COOKIE_SESI, kenaliPerangkat, perangkatDikenal, tutupSesi, wajib } from "./auth.ts";
import { ambilPesanan, bulanTerkunci, cabutSesiLain, catatLog, galatStatus, galatUbahPesanan, hariTerpadat, kekurangan, kunciBulan, nomorBerikut, pengaturan, PENGATURAN_BAWAAN, salinPesanan, setStatusPesanan, unitDirawat, type Aset } from "./data.ts";
import { jalankan, satu, semua, sisip, transaksi } from "./db.ts";
import { hariIni, LABEL_STATUS, rupiah } from "./format.ts";
import { hapusBerkasFoto, simpanBerkasFoto } from "./foto.ts";
import { bacaChecklist, bacaRupiah, bulanSah, galatLamaPesanan, MAKS_FOTO_PER_ASET, MAKS_JUMLAH, MAKS_UANG, MAKS_UKURAN_FOTO, nilaiBaris, selisihHari, tambahHari, tampakJpeg, tanggalSah, totalPesanan, type ButirChecklist } from "./hitung.ts";
import { batasMasuk, bersihkanPembatas, catatPercobaan, JENDELA_MASUK, lupakanPerangkat, lupakanPercobaan, melewatiBatas } from "./pembatas.ts";
import { cocokSandi, cocokSandiPalsu, hashSandi, hashToken, samaAman } from "./sandi.ts";

// Galat yang pesannya boleh ditampilkan ke pengguna. Galat lain dibiarkan naik ke halaman error.
class Galat extends Error {}

async function coba(fn: () => Promise<void>): Promise<string | null> {
  try {
    await transaksi(fn);
    return null;
  } catch (e) {
    if (e instanceof Galat) return e.message;
    throw e;
  }
}

// Mengalihkan kembali dengan pesan galat. `acak` membuat alamatnya selalu baru, supaya galat yang sama dua kali
// berturut-turut tetap terbaca sebagai kejadian baru. `tersimpan` menandai pesan yang datanya sudah masuk dan
// hanya berisi peringatan, sehingga formulirnya tidak dibuka lagi (lihat src/komponen/jaga-isian.tsx).
function gagal(jalur: string, pesan: string, tersimpan = false): never {
  const [alamat, jangkar] = jalur.split("#");
  const acak = Math.random().toString(36).slice(2, 8);
  redirect(
    `${alamat}${alamat.includes("?") ? "&" : "?"}galat=${encodeURIComponent(pesan)}${tersimpan ? "&tersimpan=1" : ""}&acak=${acak}${jangkar ? `#${jangkar}` : ""}`,
  );
}

function teks(fd: FormData, kunci: string, maks = 200): string {
  return String(fd.get(kunci) ?? "").trim().slice(0, maks);
}

// Bilangan bulat untuk id dan jumlah. Isian uang jangan lewat sini, pakai uang().
function bulat(nilai: FormDataEntryValue | null): number {
  const n = parseInt(String(nilai ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

// Jumlah atau hari: bilangan bulat tidak negatif dengan batas atas, supaya hasil kali dan SUM tidak meluap.
function banyak(nilai: FormDataEntryValue | null, label: string, jalur: string): number {
  const n = Math.max(0, bulat(nilai));
  if (n > MAKS_JUMLAH) gagal(jalur, `${label} paling banyak ${MAKS_JUMLAH.toLocaleString("id-ID")}.`);
  return n;
}

// Isian uang. Kosong menghasilkan nilai bawaan. Isian yang tidak bisa dipastikan atau di atas batas ditolak.
function uang(nilai: FormDataEntryValue | null, label: string, jalur: string, kosong = 0): number {
  const isi = String(nilai ?? "").trim();
  if (isi === "") return kosong;
  const n = bacaRupiah(isi);
  if (n === null) gagal(jalur, `${label} tidak bisa dibaca. Tulis angka rupiah saja, misalnya 1500000 atau 1.500.000.`);
  if (n > MAKS_UANG) gagal(jalur, `${label} melebihi batas ${rupiah(MAKS_UANG)}.`);
  return n;
}

function pilihan<T extends string>(nilai: string, daftar: readonly T[], bawaan: T): T {
  return (daftar as readonly string[]).includes(nilai) ? (nilai as T) : bawaan;
}

async function pastikanTerbuka(tanggal: string): Promise<void> {
  if (await bulanTerkunci(tanggal)) throw new Galat(`Bulan ${tanggal.slice(0, 7)} sudah ditutup. Buka periodenya dulu di Bagi Hasil.`);
}

// Masuk dan keluar

export async function masuk(fd: FormData): Promise<void> {
  const username = teks(fd, "username", 60).toLowerCase();
  const sandi = String(fd.get("sandi") ?? "");
  const ip = await alamatIp();
  // Rincian hitungan dan alasannya ada di batasMasuk (pembatas.ts).
  const batas = batasMasuk(ip, username, await perangkatDikenal(username));
  if (await melewatiBatas(batas, JENDELA_MASUK)) gagal("/masuk", "Terlalu banyak percobaan. Coba lagi 15 menit lagi.");
  const salah = async (pesan: string): Promise<never> => {
    for (const b of batas) await catatPercobaan(b.kunci, JENDELA_MASUK);
    gagal("/masuk", pesan);
  };
  const berhasil = async (id: number): Promise<never> => {
    await lupakanPercobaan(batas.filter((b) => b.lupakan).map((b) => b.kunci));
    await bersihkanPembatas();
    await kenaliPerangkat(id);
    await bukaSesi(id);
    redirect("/sistem");
  };

  // Basis data tanpa pengguna: formulir masuk membuat akun admin pertama. Supaya orang asing yang kebetulan
  // membuka /masuk lebih dulu tidak bisa merebutnya, formulir ini meminta kode SETUP_TOKEN dari .env.
  if (!(await satu("SELECT 1 FROM pengguna LIMIT 1"))) {
    const kode = process.env.SETUP_TOKEN ?? "";
    if (kode.length < 16) gagal("/masuk", "SETUP_TOKEN di .env belum diisi atau kurang dari 16 karakter.");
    if (!samaAman(String(fd.get("kode") ?? ""), kode)) return salah("Kode penyiapan salah.");
    const nama = teks(fd, "nama", 80);
    if (!nama || !/^[a-z0-9._-]{3,30}$/.test(username) || sandi.length < 8) {
      gagal("/masuk", "Isi nama, username (3 sampai 30 huruf kecil atau angka), dan kata sandi minimal 8 karakter.");
    }
    const id = await sisip("INSERT INTO pengguna (nama, username, sandi, peran) VALUES (?, ?, ?, 'admin')", nama, username, hashSandi(sandi));
    await catatLog({ id, nama }, "Buat admin pertama", `Username ${username}`);
    await berhasil(id);
  }

  const u = await satu<{ id: number; nama: string; sandi: string }>("SELECT id, nama, sandi FROM pengguna WHERE username = ? AND aktif = 1", username);
  const cocok = u ? cocokSandi(sandi, u.sandi) : cocokSandiPalsu(sandi);
  if (!u || !cocok) return salah("Username atau kata sandi salah.");
  await catatLog(u, "Masuk", ip ? `IP ${ip}` : "");
  await berhasil(u.id);
}

export async function keluar(): Promise<void> {
  await tutupSesi();
  redirect("/masuk");
}

// Formulir publik di website

export async function kirimPermintaan(fd: FormData): Promise<void> {
  // Isian jebakan untuk bot. Manusia tidak melihatnya.
  if (teks(fd, "situs")) redirect("/?terkirim=1#kontak");
  // Batas per alamat, ditambah batas total supaya CRM tidak bisa dibanjiri walau alamatnya dipalsukan.
  // Yang dihitung hanya kiriman yang benar-benar masuk ke CRM.
  const ip = await alamatIp();
  const batas = [...(ip ? [{ kunci: `permintaan|${ip}`, maks: 5 }] : []), { kunci: "permintaan-total", maks: 60 }];
  if (await melewatiBatas(batas, 60)) gagal("/#kontak", "Terlalu banyak kiriman. Coba lagi nanti atau hubungi kami lewat telepon.");
  const nama = teks(fd, "nama", 80);
  const telepon = teks(fd, "telepon", 30);
  if (!nama || !/^[\d+\s()-]{8,30}$/.test(telepon)) gagal("/#kontak", "Isi nama dan nomor telepon yang bisa dihubungi.");
  const tgl = teks(fd, "tanggal", 10);
  const jenisAcara = teks(fd, "jenis_acara", 100);
  const tamu = bulat(fd.get("tamu"));
  const rincian = [
    tanggalSah(tgl) ? `Tanggal acara: ${tgl}` : "",
    teks(fd, "lokasi", 200) && `Lokasi: ${teks(fd, "lokasi", 200)}`,
    jenisAcara && `Jenis acara: ${jenisAcara}`,
    tamu > 0 && tamu <= 1_000_000 ? `Perkiraan jumlah tamu: ${tamu}` : "",
    teks(fd, "kebutuhan", 1000),
  ].filter(Boolean);
  await jalankan(
    "INSERT INTO kontak (nama, perusahaan, telepon, sumber, kebutuhan, tindak_lanjut, dibuat) VALUES (?, ?, ?, 'website', ?, ?, ?)",
    nama,
    teks(fd, "perusahaan", 120),
    telepon,
    rincian.join("\n"),
    hariIni(),
    hariIni(),
  );
  for (const b of batas) await catatPercobaan(b.kunci, 60);
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
    await jalankan(
      "UPDATE kontak SET nama = ?, perusahaan = ?, telepon = ?, email = ?, jenis = ?, sumber = ?, tahap = ?, kebutuhan = ?, tindak_lanjut = ? WHERE id = ?",
      ...isi,
      id,
    );
    redirect(kembali);
  }
  const baru = await sisip(
    "INSERT INTO kontak (nama, perusahaan, telepon, email, jenis, sumber, tahap, kebutuhan, tindak_lanjut, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ...isi,
    hariIni(),
  );
  redirect(`/sistem/kontak/${baru}`);
}

export async function ubahTahap(id: number, tahap: string): Promise<void> {
  await wajib("kontak.tulis");
  await jalankan("UPDATE kontak SET tahap = ? WHERE id = ?", pilihan(tahap, TAHAP, "baru"), id);
  redirect("/sistem/kontak");
}

// Pesanan: penawaran, booking, pelaksanaan, faktur

export async function simpanPesanan(fd: FormData): Promise<void> {
  const u = await wajib("pesanan.tulis");
  let id = bulat(fd.get("id"));
  const sebelum = id ? await ambilPesanan(id) : undefined;
  const totalLama = sebelum?.total;
  const kontakId = bulat(fd.get("kontak_id"));
  const kembali = id ? `/sistem/pesanan/${id}` : `/sistem/pesanan/baru?kontak=${kontakId}`;
  const acara = teks(fd, "acara", 160);
  const mulai = teks(fd, "mulai", 10);
  const selesai = teks(fd, "selesai", 10);
  const diskon = uang(fd.get("diskon"), "Diskon", kembali);
  if (!(await satu("SELECT 1 FROM kontak WHERE id = ?", kontakId))) gagal(kembali, "Pilih pelanggan dulu.");
  if (!acara) gagal(kembali, "Nama acara wajib diisi.");
  if (!mulai || !selesai) gagal(kembali, "Isi tanggal pasang dan tanggal bongkar.");
  if (!tanggalSah(mulai)) gagal(kembali, "Tanggal pasang tidak bisa dibaca. Pakai tanggal di tahun 2000 sampai 2100.");
  if (!tanggalSah(selesai)) gagal(kembali, "Tanggal bongkar tidak bisa dibaca. Pakai tanggal di tahun 2000 sampai 2100.");
  if (selesai < mulai) gagal(kembali, "Tanggal bongkar tidak boleh lebih awal dari tanggal pasang.");
  const lamaGalat = galatLamaPesanan(mulai, selesai);
  if (lamaGalat) gagal(kembali, lamaGalat);

  const aset = new Map((await semua<Aset>("SELECT * FROM aset")).map((a) => [a.id, a]));
  const kolom = (k: string) => fd.getAll(k);
  const [bAset, bDesk, bJumlah, bHari, bHarga] = ["b_aset", "b_deskripsi", "b_jumlah", "b_hari", "b_harga"].map(kolom);
  const baris: { asetId: number | null; deskripsi: string; jumlah: number; hari: number; harga: number }[] = [];
  bAset.forEach((nilai, i) => {
    const a = aset.get(bulat(nilai));
    const jumlah = banyak(bJumlah[i], `Jumlah baris ${i + 1}`, kembali);
    const deskripsi = String(bDesk[i] ?? "").trim().slice(0, 200) || (a ? [a.nama, a.ukuran].filter(Boolean).join(" ") : "");
    if (jumlah <= 0 || !deskripsi) return;
    const hargaIsi = String(bHarga[i] ?? "").trim();
    baris.push({
      asetId: a?.id ?? null,
      deskripsi,
      jumlah,
      hari: Math.max(1, banyak(bHari[i], `Hari baris ${i + 1}`, kembali)),
      harga: uang(hargaIsi, `Harga baris ${i + 1}`, kembali, a?.harga ?? 0),
    });
  });
  if (baris.length === 0) gagal(kembali, "Isi minimal satu baris dengan jumlah lebih dari nol.");
  if (baris.some((b) => nilaiBaris(b) > MAKS_UANG) || totalPesanan(baris, 0).subtotal > MAKS_UANG) {
    gagal(kembali, `Nilai pesanan melebihi batas ${rupiah(MAKS_UANG)}. Periksa jumlah, hari, dan harga.`);
  }

  const galat = await coba(async () => {
    if (id) {
      const lama = await satu<{ status: string; mulai: string; selesai: string }>("SELECT status, mulai, selesai FROM pesanan WHERE id = ?", id);
      if (!lama) throw new Galat("Pesanan tidak ditemukan.");
      if (lama.status === "selesai" || lama.status === "batal") throw new Galat("Pesanan yang sudah selesai atau batal tidak bisa diubah.");
      const galatUbah = await galatUbahPesanan(id, { baris, diskon, mulai, selesai });
      if (galatUbah) throw new Galat(galatUbah);
      // Tugas pasang dan bongkar yang belum selesai ikut pindah kalau tanggal pesanan digeser. Tugas yang
      // tanggalnya sudah diubah manual (tidak sama dengan tanggal lama) dibiarkan.
      await jalankan("UPDATE tugas SET tanggal = ? WHERE pesanan_id = ? AND jenis = 'pasang' AND selesai = 0 AND tanggal = ?", mulai, id, lama.mulai);
      await jalankan("UPDATE tugas SET tanggal = ? WHERE pesanan_id = ? AND jenis = 'bongkar' AND selesai = 0 AND tanggal = ?", selesai, id, lama.selesai);
      await jalankan(
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
      await jalankan("DELETE FROM pesanan_baris WHERE pesanan_id = ?", id);
    } else {
      const hari = hariIni();
      id = await sisip(
        "INSERT INTO pesanan (nomor, kontak_id, acara, lokasi, mulai, selesai, diskon, catatan, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        await nomorBerikut(hari),
        kontakId,
        acara,
        teks(fd, "lokasi", 300),
        mulai,
        selesai,
        diskon,
        teks(fd, "catatan", 2000),
        hari,
      );
      await jalankan("UPDATE kontak SET tahap = 'penawaran' WHERE id = ? AND tahap IN ('baru', 'dihubungi')", kontakId);
    }
    for (const b of baris) {
      await jalankan(
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
    const status = (await satu<{ status: string }>("SELECT status FROM pesanan WHERE id = ?", id))!.status;
    if (status === "booking" || status === "berjalan") {
      const kurang = await kekurangan(id);
      if (kurang.length) throw new Galat(`Aset tidak cukup di tanggal itu. ${kurang.join("; ")}.`);
    }
    const p = (await ambilPesanan(id))!;
    if (totalLama === undefined) await catatLog(u, "Buat penawaran", `${p.nomor}, ${p.acara}, total ${rupiah(p.total)}`);
    else {
      const geser = sebelum && (sebelum.mulai !== mulai || sebelum.selesai !== selesai);
      const tanggal = geser
        ? `tanggal dari ${sebelum.mulai} sampai ${sebelum.selesai} menjadi ${mulai} sampai ${selesai}`
        : `tanggal tetap ${mulai} sampai ${selesai}`;
      await catatLog(u, "Ubah pesanan", `${p.nomor}, total dari ${rupiah(totalLama)} menjadi ${rupiah(p.total)}, ${tanggal}`);
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

async function butirBawaan(jenis: string): Promise<string> {
  const s = await pengaturan();
  const sumber = jenis === "pasang" ? s.checklist_pasang : jenis === "bongkar" ? s.checklist_bongkar : "";
  const butir: ButirChecklist[] = sumber.split("\n").map((t) => t.trim()).filter(Boolean).map((t) => ({ teks: t, beres: false }));
  return JSON.stringify(butir);
}

export async function ubahStatus(id: number, tujuan: string): Promise<void> {
  const u = await wajib("pesanan.tulis");
  const kembali = `/sistem/pesanan/${id}`;
  const galat = await coba(async () => {
    const p = await ambilPesanan(id);
    if (!p) throw new Galat("Pesanan tidak ditemukan.");
    if (!JALUR_STATUS[p.status]?.includes(tujuan)) throw new Galat("Perubahan status itu tidak diizinkan.");
    const galatUang = galatStatus(p, tujuan);
    if (galatUang) throw new Galat(galatUang);
    // Faktur yang sudah masuk periode tertutup tidak boleh dicabut diam-diam.
    if (tujuan === "penawaran" && p.status === "booking" && p.tgl_faktur) await pastikanTerbuka(p.tgl_faktur);
    if (tujuan === "booking") {
      const kurang = await kekurangan(id);
      if (kurang.length) throw new Galat(`Belum bisa dibooking, aset tidak cukup. ${kurang.join("; ")}.`);
      // Jadwal pasang dan bongkar dibuat sekali per jenis, lengkap dengan checklist bawaan.
      for (const [jenis, tgl] of [["pasang", p.mulai], ["bongkar", p.selesai]]) {
        if (!(await satu("SELECT 1 FROM tugas WHERE pesanan_id = ? AND jenis = ?", id, jenis))) {
          await jalankan("INSERT INTO tugas (pesanan_id, jenis, tanggal, checklist) VALUES (?, ?, ?, ?)", id, jenis, tgl, await butirBawaan(jenis));
        }
      }
      await jalankan("UPDATE kontak SET tahap = 'menang' WHERE id = ?", p.kontak_id);
    }
    if (p.status === "booking" && (tujuan === "penawaran" || tujuan === "batal")) {
      // Booking dilepas: tugas lapangan yang belum dikerjakan dihapus supaya tidak muncul di jadwal kru, dan
      // kontak yang tidak punya booking lain kembali ke tahap penawaran (atau kalah kalau pesanannya batal).
      await jalankan("DELETE FROM tugas WHERE pesanan_id = ? AND selesai = 0", id);
      const lainAktif = await satu(
        "SELECT 1 FROM pesanan WHERE kontak_id = ? AND id <> ? AND status IN ('booking', 'berjalan', 'selesai')",
        p.kontak_id,
        id,
      );
      if (!lainAktif) {
        await jalankan("UPDATE kontak SET tahap = ? WHERE id = ? AND tahap = 'menang'", tujuan === "batal" ? "kalah" : "penawaran", p.kontak_id);
      }
    }
    if (tujuan === "selesai" && !p.tgl_faktur) {
      await pastikanTerbuka(hariIni());
      await jalankan("UPDATE pesanan SET tgl_faktur = ? WHERE id = ?", hariIni(), id);
    }
    await setStatusPesanan(id, tujuan);
    await catatLog(u, "Ubah status pesanan", `${p.nomor}, dari ${LABEL_STATUS[p.status]} ke ${LABEL_STATUS[tujuan]}`);
  });
  if (galat) gagal(kembali, galat);
  redirect(kembali);
}

export async function terbitkanFaktur(id: number): Promise<void> {
  const u = await wajib("pesanan.tulis");
  const kembali = `/sistem/pesanan/${id}`;
  const galat = await coba(async () => {
    const p = await ambilPesanan(id);
    if (!p || p.status === "penawaran" || p.status === "batal") throw new Galat("Faktur hanya bisa terbit untuk pesanan yang sudah dibooking.");
    if (p.tgl_faktur) throw new Galat("Faktur sudah terbit.");
    await pastikanTerbuka(hariIni());
    await jalankan("UPDATE pesanan SET tgl_faktur = ? WHERE id = ?", hariIni(), id);
    await catatLog(u, "Terbitkan faktur", `${p.nomor}, total ${rupiah(p.total)}`);
  });
  if (galat) gagal(kembali, galat);
  redirect(kembali);
}

// Menyalin pesanan menjadi penawaran baru di tanggal lain, untuk pelanggan yang memesan berulang.
export async function duplikatPesanan(id: number, fd: FormData): Promise<void> {
  const u = await wajib("pesanan.tulis");
  const mulai = teks(fd, "mulai", 10);
  const p = await ambilPesanan(id);
  if (!p) gagal("/sistem/pesanan", "Pesanan tidak ditemukan.");
  if (!mulai) gagal(`/sistem/pesanan/${id}`, "Isi tanggal pasang untuk pesanan baru.");
  if (!tanggalSah(mulai)) gagal(`/sistem/pesanan/${id}`, "Tanggal pasang tidak bisa dibaca. Pakai tanggal di tahun 2000 sampai 2100.");
  const galatLama = galatLamaPesanan(p.mulai, p.selesai);
  if (galatLama) gagal(`/sistem/pesanan/${id}`, galatLama);
  const lama = selisihHari(p.mulai, p.selesai);
  const selesai = tambahHari(mulai, lama);
  if (!tanggalSah(selesai)) gagal(`/sistem/pesanan/${id}`, "Tanggal bongkar pesanan baru jatuh di luar tahun 2000 sampai 2100.");
  const baru = await salinPesanan(u, id, mulai, selesai);
  redirect(`/sistem/pesanan/${baru}`);
}

export async function hapusPesanan(id: number): Promise<void> {
  const u = await wajib("pesanan.tulis");
  const galat = await coba(async () => {
    const p = await ambilPesanan(id);
    if (!p) throw new Galat("Pesanan tidak ditemukan.");
    if (p.status !== "penawaran" && p.status !== "batal") throw new Galat("Hanya penawaran atau pesanan batal yang bisa dihapus.");
    if (p.dibayar > 0) throw new Galat("Pesanan ini punya pembayaran.");
    // Anak-anak pesanan dihapus terang-terangan, tanpa bergantung pada ON DELETE CASCADE dan SET NULL di skema.
    await jalankan("DELETE FROM pesanan_baris WHERE pesanan_id = ?", id);
    await jalankan("DELETE FROM tugas WHERE pesanan_id = ?", id);
    await jalankan("DELETE FROM pembayaran WHERE pesanan_id = ?", id);
    await jalankan("UPDATE biaya SET pesanan_id = NULL WHERE pesanan_id = ?", id);
    await jalankan("DELETE FROM pesanan WHERE id = ?", id);
    await catatLog(u, "Hapus pesanan", `${p.nomor}, ${p.acara}, total ${rupiah(p.total)}`);
  });
  if (galat) gagal(`/sistem/pesanan/${id}`, galat);
  redirect("/sistem/pesanan");
}

// Uang masuk dan biaya

export async function tambahPembayaran(pesananId: number, fd: FormData): Promise<void> {
  const u = await wajib("pesanan.tulis");
  const kembali = `/sistem/pesanan/${pesananId}`;
  const tgl = teks(fd, "tanggal", 10);
  const jumlah = uang(fd.get("jumlah"), "Jumlah pembayaran", kembali);
  const galat = await coba(async () => {
    const p = await ambilPesanan(pesananId);
    if (!p || p.status === "penawaran" || p.status === "batal") throw new Galat("Pembayaran hanya untuk pesanan yang sudah dibooking.");
    if (!tanggalSah(tgl) || jumlah <= 0) throw new Galat("Isi tanggal dan jumlah pembayaran.");
    if (jumlah > p.sisa) throw new Galat("Jumlah melebihi sisa tagihan.");
    await pastikanTerbuka(tgl);
    const metode = pilihan(teks(fd, "metode"), ["transfer", "tunai", "lainnya"], "transfer");
    await jalankan(
      "INSERT INTO pembayaran (pesanan_id, tanggal, jumlah, metode, catatan) VALUES (?, ?, ?, ?, ?)",
      pesananId,
      tgl,
      jumlah,
      metode,
      teks(fd, "catatan", 200),
    );
    await catatLog(u, "Catat pembayaran masuk", `${p.nomor}, ${rupiah(jumlah)} lewat ${metode}, tanggal ${tgl}`);
  });
  if (galat) gagal(kembali, galat);
  redirect(kembali);
}

export async function hapusPembayaran(id: number): Promise<void> {
  const u = await wajib("keuangan.tulis");
  const b = await satu<{ pesanan_id: number; tanggal: string; jumlah: number; nomor: string }>(
    "SELECT b.pesanan_id, b.tanggal, b.jumlah, p.nomor FROM pembayaran b JOIN pesanan p ON p.id = b.pesanan_id WHERE b.id = ?",
    id,
  );
  if (!b) redirect("/sistem/pesanan");
  const kembali = `/sistem/pesanan/${b.pesanan_id}`;
  const galat = await coba(async () => {
    await pastikanTerbuka(b.tanggal);
    await jalankan("DELETE FROM pembayaran WHERE id = ?", id);
    await catatLog(u, "Hapus pembayaran masuk", `${b.nomor}, ${rupiah(b.jumlah)}, tanggal ${b.tanggal}`);
  });
  if (galat) gagal(kembali, galat);
  redirect(kembali);
}

export async function tambahBiaya(fd: FormData): Promise<void> {
  const u = await wajib("keuangan.tulis");
  const pesananId = bulat(fd.get("pesanan_id"));
  const tgl = teks(fd, "tanggal", 10);
  const kembali = pesananId ? `/sistem/pesanan/${pesananId}` : `/sistem/keuangan?bulan=${tgl.slice(0, 7)}`;
  const jumlah = uang(fd.get("jumlah"), "Jumlah biaya", tanggalSah(tgl) ? kembali : "/sistem/keuangan");
  const kategori = teks(fd, "kategori", 60);
  const galat = await coba(async () => {
    if (!tanggalSah(tgl) || jumlah <= 0 || !kategori) throw new Galat("Isi tanggal, kategori, dan jumlah biaya.");
    if (pesananId && !(await satu("SELECT 1 FROM pesanan WHERE id = ?", pesananId))) throw new Galat("Pesanan tidak ditemukan.");
    await pastikanTerbuka(tgl);
    await jalankan(
      "INSERT INTO biaya (tanggal, jenis, kategori, pesanan_id, jumlah, keterangan) VALUES (?, ?, ?, ?, ?, ?)",
      tgl,
      pesananId ? "langsung" : "operasional",
      kategori,
      pesananId || null,
      jumlah,
      teks(fd, "keterangan", 300),
    );
    await catatLog(u, pesananId ? "Catat biaya langsung" : "Catat biaya operasional", `${kategori}, ${rupiah(jumlah)}, tanggal ${tgl}${pesananId ? `, pesanan #${pesananId}` : ""}`);
  });
  if (galat) gagal(tanggalSah(tgl) ? kembali : "/sistem/keuangan", galat);
  redirect(kembali);
}

export async function hapusBiaya(id: number): Promise<void> {
  const u = await wajib("keuangan.tulis");
  const b = await satu<{ pesanan_id: number | null; tanggal: string; jenis: string; kategori: string; jumlah: number }>(
    "SELECT pesanan_id, tanggal, jenis, kategori, jumlah FROM biaya WHERE id = ?",
    id,
  );
  if (!b) redirect("/sistem/keuangan");
  const kembali = b.pesanan_id ? `/sistem/pesanan/${b.pesanan_id}` : `/sistem/keuangan?bulan=${b.tanggal.slice(0, 7)}`;
  const galat = await coba(async () => {
    await pastikanTerbuka(b.tanggal);
    await jalankan("DELETE FROM biaya WHERE id = ?", id);
    await catatLog(u, `Hapus biaya ${b.jenis}`, `${b.kategori}, ${rupiah(b.jumlah)}, tanggal ${b.tanggal}`);
  });
  if (galat) gagal(kembali, galat);
  redirect(kembali);
}

// Aset dan perawatan

export async function simpanAset(fd: FormData): Promise<void> {
  const u = await wajib("aset.tulis");
  const id = bulat(fd.get("id"));
  const kembali = id ? `/sistem/aset/${id}` : "/sistem/aset";
  const kode = teks(fd, "kode", 20).toUpperCase();
  const nama = teks(fd, "nama", 120);
  const kategori = teks(fd, "kategori", 60);
  if (!kode || !nama || !kategori) gagal(kembali, "Kode, nama, dan kategori wajib diisi.");
  if (await satu("SELECT 1 FROM aset WHERE kode = ? AND id <> ?", kode, id)) gagal(kembali, `Kode ${kode} sudah dipakai aset lain.`);
  const isi = [
    kode,
    nama,
    kategori,
    teks(fd, "ukuran", 40),
    teks(fd, "satuan", 20) || "unit",
    banyak(fd.get("jumlah"), "Jumlah unit", kembali),
    uang(fd.get("harga"), "Harga sewa", kembali),
    teks(fd, "deskripsi", 300),
    fd.get("tampil_web") ? 1 : 0,
    fd.get("aktif") ? 1 : 0,
    teks(fd, "kapasitas", 60),
    teks(fd, "cocok", 80),
  ];
  if (id) {
    const lama = await satu<Aset>("SELECT * FROM aset WHERE id = ?", id);
    if (lama && (lama.jumlah !== isi[5] || lama.harga !== isi[6])) {
      await catatLog(u, "Ubah aset", `${kode} ${nama}, jumlah dari ${lama.jumlah} menjadi ${isi[5]}, harga dari ${rupiah(lama.harga)} menjadi ${rupiah(Number(isi[6]))}`);
    }
    await jalankan(
      "UPDATE aset SET kode = ?, nama = ?, kategori = ?, ukuran = ?, satuan = ?, jumlah = ?, harga = ?, deskripsi = ?, tampil_web = ?, aktif = ?, kapasitas = ?, cocok = ? WHERE id = ?",
      ...isi,
      id,
    );
    // Jumlah aset boleh diturunkan (unit hilang atau dijual), tapi booking yang terdampak harus terlihat.
    const peringatan = await peringatanStok(id, Number(isi[5]), hariIni());
    if (peringatan) gagal(kembali, `Aset disimpan. ${peringatan}`, true);
  } else {
    const baru = await sisip(
      "INSERT INTO aset (kode, nama, kategori, ukuran, satuan, jumlah, harga, deskripsi, tampil_web, aktif, kapasitas, cocok) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ...isi,
    );
    await catatLog(u, "Tambah aset", `${kode} ${nama}, jumlah ${isi[5]}, harga ${rupiah(Number(isi[6]))}`);
    // Aset baru langsung dibuka supaya fotonya bisa ditambahkan.
    redirect(`/sistem/aset/${baru}?ok=${encodeURIComponent("Aset tersimpan. Tambahkan fotonya di bagian Foto.")}`);
  }
  redirect("/sistem/aset");
}

// Foto aset. Browser menyiapkannya sebagai JPEG HD lalu mengirimnya satu per satu, jadi tiap kiriman tetap di
// bawah batas ukuran aksi server (bodySizeLimit di next.config.ts). Isi yang bukan JPEG ditolak.
export async function tambahFoto(asetId: number, fd: FormData): Promise<{ galat?: string }> {
  await wajib("aset.tulis");
  const berkas = fd.get("foto");
  if (!(berkas instanceof File)) return { galat: "Tidak ada foto yang dikirim." };
  if (berkas.size > MAKS_UKURAN_FOTO) return { galat: "Foto terlalu besar." };
  if (!(await satu("SELECT 1 FROM aset WHERE id = ?", asetId))) return { galat: "Aset tidak ditemukan." };
  const isi = new Uint8Array(await berkas.arrayBuffer());
  if (!tampakJpeg(isi)) return { galat: "Berkas itu bukan foto JPEG." };
  const sudah = (await satu<{ n: number; akhir: number | null }>("SELECT COUNT(*) AS n, MAX(urutan) AS akhir FROM aset_foto WHERE aset_id = ?", asetId))!;
  if (sudah.n >= MAKS_FOTO_PER_ASET) return { galat: `Satu aset paling banyak ${MAKS_FOTO_PER_ASET} foto.` };
  const nama = await simpanBerkasFoto(isi);
  await jalankan("INSERT INTO aset_foto (aset_id, berkas, urutan) VALUES (?, ?, ?)", asetId, nama, (sudah.akhir ?? 0) + 1);
  refresh();
  return {};
}

export async function hapusFoto(id: number): Promise<void> {
  await wajib("aset.tulis");
  const f = await satu<{ aset_id: number; berkas: string }>("SELECT aset_id, berkas FROM aset_foto WHERE id = ?", id);
  if (!f) redirect("/sistem/aset");
  await jalankan("DELETE FROM aset_foto WHERE id = ?", id);
  await hapusBerkasFoto(f.berkas);
  redirect(`/sistem/aset/${f.aset_id}#foto`);
}

// Foto dengan urutan terkecil menjadi sampul di katalog.
export async function jadikanSampul(id: number): Promise<void> {
  await wajib("aset.tulis");
  const f = await satu<{ aset_id: number }>("SELECT aset_id FROM aset_foto WHERE id = ?", id);
  if (!f) redirect("/sistem/aset");
  const awal = (await satu<{ n: number }>("SELECT MIN(urutan) AS n FROM aset_foto WHERE aset_id = ?", f.aset_id))!.n;
  await jalankan("UPDATE aset_foto SET urutan = ? WHERE id = ?", awal - 1, id);
  redirect(`/sistem/aset/${f.aset_id}#foto`);
}

export async function tambahPerawatan(asetId: number, fd: FormData): Promise<void> {
  await wajib("aset.tulis");
  const kembali = `/sistem/aset/${asetId}`;
  const jumlah = bulat(fd.get("jumlah"));
  const mulai = teks(fd, "mulai", 10);
  let total = 0;
  // Pemeriksaan dan pencatatan ada di satu transaksi, supaya dua catatan yang masuk bersamaan tidak sama-sama
  // lolos lalu melebihi unit yang dimiliki.
  const galat = await coba(async () => {
    const a = await satu<Aset>("SELECT * FROM aset WHERE id = ?", asetId);
    if (!a || jumlah <= 0 || jumlah > a.jumlah || !tanggalSah(mulai)) throw new Galat("Isi jumlah unit (tidak lebih dari total) dan tanggal mulai.");
    // Semua catatan perawatan yang masih berjalan dijumlahkan, supaya unit yang diperbaiki tidak melebihi unit yang dimiliki.
    const dirawat = await unitDirawat(asetId, mulai);
    if (dirawat + jumlah > a.jumlah) {
      throw new Galat(`Sudah ada ${dirawat} unit yang masih diperbaiki. Dari ${a.jumlah} unit, paling banyak ${Math.max(0, a.jumlah - dirawat)} unit lagi yang bisa dicatat.`);
    }
    await jalankan("INSERT INTO perawatan (aset_id, jumlah, mulai, catatan) VALUES (?, ?, ?, ?)", asetId, jumlah, mulai, teks(fd, "catatan", 300));
    total = a.jumlah;
  });
  if (galat) gagal(kembali, galat);
  // Unit yang rusak tetap dicatat karena memang tidak bisa dipakai, tapi gudang dan sales perlu tahu kalau
  // booking yang sudah ada jadi kekurangan.
  const peringatan = await peringatanStok(asetId, total, mulai);
  if (peringatan) gagal(kembali, `Perawatan dicatat. ${peringatan}`, true);
  redirect(kembali);
}

// Pesan kalau pemakaian di hari terpadat sejak tanggal awal melebihi jumlah aset. Kosong berarti aman.
async function peringatanStok(asetId: number, total: number, awal: string): Promise<string | null> {
  const padat = await hariTerpadat(asetId, awal);
  if (!padat || padat.jumlah <= total) return null;
  return `Perhatian: tanggal ${padat.tanggal} butuh ${padat.jumlah} unit untuk booking dan perawatan, padahal jumlah aset ${total}. Cek kalender dan atur ulang booking yang terdampak.`;
}

export async function selesaiPerawatan(id: number): Promise<void> {
  await wajib("aset.tulis");
  const r = await satu<{ aset_id: number; mulai: string }>("SELECT aset_id, mulai FROM perawatan WHERE id = ?", id);
  if (!r) redirect("/sistem/aset");
  const hari = hariIni();
  await jalankan("UPDATE perawatan SET selesai = ? WHERE id = ?", hari < r.mulai ? r.mulai : hari, id);
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
    const lama = await satu<{ checklist: string }>("SELECT checklist FROM tugas WHERE id = ? AND pesanan_id = ?", id, pesananId);
    if (!lama) gagal(kembali, "Tugas tidak ditemukan.");
    const beres = new Set(bacaChecklist(lama.checklist).filter((b) => b.beres).map((b) => b.teks));
    const butir = teks(fd, "butir", 3000).split("\n").map((t) => t.trim()).filter(Boolean).map((t) => ({ teks: t, beres: beres.has(t) }));
    await jalankan("UPDATE tugas SET jenis = ?, tanggal = ?, kru = ?, checklist = ? WHERE id = ?", jenis, tgl, kru, JSON.stringify(butir), id);
  } else {
    await jalankan("INSERT INTO tugas (pesanan_id, jenis, tanggal, kru, checklist) VALUES (?, ?, ?, ?, ?)", pesananId, jenis, tgl, kru, await butirBawaan(jenis));
  }
  redirect(kembali);
}

export async function hapusTugas(id: number): Promise<void> {
  await wajib("jadwal.tulis");
  const t = await satu<{ pesanan_id: number }>("SELECT pesanan_id FROM tugas WHERE id = ?", id);
  await jalankan("DELETE FROM tugas WHERE id = ?", id);
  redirect(t ? `/sistem/pesanan/${t.pesanan_id}` : "/sistem/jadwal");
}

export async function centangTugas(id: number, fd: FormData): Promise<void> {
  await wajib("jadwal.centang");
  const t = await satu<{ checklist: string }>("SELECT checklist FROM tugas WHERE id = ?", id);
  if (!t) redirect("/sistem/jadwal");
  const dicentang = new Set(fd.getAll("butir").map(String));
  const butir = bacaChecklist(t.checklist).map((b, i) => ({ ...b, beres: dicentang.has(String(i)) }));
  await jalankan(
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
  const u = await wajib("keuangan.tulis");
  const galat = await coba(async () => {
    if (!bulanSah(bulan) || bulan > hariIni().slice(0, 7)) throw new Galat("Bulan itu belum bisa ditutup.");
    if (await bulanTerkunci(`${bulan}-01`)) throw new Galat("Bulan itu sudah ditutup.");
    await kunciBulan(bulan);
    const p = (await satu<{ laba_bersih: number; bagian_tenda: number; bagian_hka: number }>(
      "SELECT laba_bersih, bagian_tenda, bagian_hka FROM periode WHERE bulan = ?",
      bulan,
    ))!;
    await catatLog(u, "Tutup periode", `${bulan}, laba bersih ${rupiah(p.laba_bersih)}, Tenda ${rupiah(p.bagian_tenda)}, HKA ${rupiah(p.bagian_hka)}`);
  });
  if (galat) gagal("/sistem/bagi-hasil", galat);
  redirect("/sistem/bagi-hasil");
}

export async function bukaPeriode(bulan: string): Promise<void> {
  const u = await wajib("keuangan.tulis");
  // Satu transaksi dengan pencatatan pembayaran ke partner, supaya periode tidak terbuka tepat saat
  // pembayarannya sedang dicatat.
  const galat = await coba(async () => {
    const p = await satu<{ dibayar_tenda: number; dibayar_hka: number; laba_bersih: number }>(
      "SELECT dibayar_tenda, dibayar_hka, laba_bersih FROM periode WHERE bulan = ?",
      bulan,
    );
    if (p && (p.dibayar_tenda > 0 || p.dibayar_hka > 0)) throw new Galat("Periode ini sudah punya pembayaran ke partner. Nolkan dulu sebelum dibuka.");
    await jalankan("DELETE FROM periode WHERE bulan = ?", bulan);
    if (p) await catatLog(u, "Buka kembali periode", `${bulan}, laba bersih yang dibekukan sebelumnya ${rupiah(p.laba_bersih)}`);
  });
  if (galat) gagal("/sistem/bagi-hasil", galat);
  redirect("/sistem/bagi-hasil");
}

export async function catatBayarPartner(bulan: string, fd: FormData): Promise<void> {
  const u = await wajib("keuangan.tulis");
  const tenda = uang(fd.get("dibayar_tenda"), "Pembayaran ke Tenda Indonesia", "/sistem/bagi-hasil");
  const hka = uang(fd.get("dibayar_hka"), "Pembayaran ke HKA", "/sistem/bagi-hasil");
  const galat = await coba(async () => {
    const p = await satu<{ bagian_tenda: number; bagian_hka: number; dibayar_tenda: number; dibayar_hka: number }>(
      "SELECT bagian_tenda, bagian_hka, dibayar_tenda, dibayar_hka FROM periode WHERE bulan = ?",
      bulan,
    );
    if (!p) throw new Galat("Periode itu belum ditutup.");
    // Saat rugi, bagian partner negatif sehingga batasnya nol: tidak ada laba yang bisa dibayarkan.
    if (tenda > Math.max(0, p.bagian_tenda) || hka > Math.max(0, p.bagian_hka)) {
      throw new Galat("Pembayaran ke partner tidak boleh melebihi bagiannya di periode itu.");
    }
    await jalankan("UPDATE periode SET dibayar_tenda = ?, dibayar_hka = ?, catatan = ? WHERE bulan = ?", tenda, hka, teks(fd, "catatan", 300), bulan);
    if (tenda !== p.dibayar_tenda || hka !== p.dibayar_hka) {
      await catatLog(
        u,
        "Catat pembayaran ke partner",
        `${bulan}, Tenda dari ${rupiah(p.dibayar_tenda)} menjadi ${rupiah(tenda)}, HKA dari ${rupiah(p.dibayar_hka)} menjadi ${rupiah(hka)}`,
      );
    }
  });
  if (galat) gagal("/sistem/bagi-hasil", galat);
  redirect("/sistem/bagi-hasil");
}

// Pengaturan dan pengguna

export async function simpanPengaturan(fd: FormData): Promise<void> {
  const u = await wajib("pengaturan");
  const lama = await pengaturan();
  const angka = (k: string, maks: number) => String(Math.min(maks, Math.max(0, Number(teks(fd, k, 10).replace(",", ".")) || 0)));
  const isi: Record<keyof typeof PENGATURAN_BAWAAN, string> = {
    nama_usaha: teks(fd, "nama_usaha", 80) || PENGATURAN_BAWAAN.nama_usaha,
    telepon: teks(fd, "telepon", 30),
    whatsapp: teks(fd, "whatsapp", 30),
    email: teks(fd, "email", 120),
    alamat: teks(fd, "alamat", 300),
    rekening: teks(fd, "rekening", 200),
    basis: pilihan(teks(fd, "basis"), ["kas", "akrual"], "kas"),
    persen_cadangan: angka("persen_cadangan", 100),
    persen_pajak: angka("persen_pajak", 100),
    porsi_tenda: angka("porsi_tenda", 100),
    gudang_lihat_nilai: pilihan(teks(fd, "gudang_lihat_nilai"), ["tidak", "ya"], "tidak"),
    checklist_pasang: teks(fd, "checklist_pasang", 3000),
    checklist_bongkar: teks(fd, "checklist_bongkar", 3000),
  };
  await transaksi(async () => {
    for (const [k, v] of Object.entries(isi)) {
      await jalankan("INSERT INTO pengaturan (kunci, nilai) VALUES (?, ?) ON CONFLICT (kunci) DO UPDATE SET nilai = excluded.nilai", k, v);
    }
    // Kunci yang memengaruhi bagi hasil atau hak akses dicatat lengkap dengan nilai lamanya. Yang lain cukup namanya.
    const rumus = ["basis", "persen_cadangan", "persen_pajak", "porsi_tenda", "gudang_lihat_nilai"];
    const berubah = (Object.keys(isi) as (keyof typeof isi)[]).filter((k) => lama[k] !== isi[k]);
    if (berubah.length) {
      await catatLog(u, "Ubah pengaturan", berubah.map((k) => (rumus.includes(k) ? `${k} dari ${lama[k]} menjadi ${isi[k]}` : k)).join("; "));
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
  if (await satu("SELECT 1 FROM pengguna WHERE username = ? AND id <> ?", username, id)) gagal(kembali, "Username sudah dipakai.");
  if ((!id || sandi) && sandi.length < 8) gagal(kembali, "Kata sandi minimal 8 karakter.");
  if (id === saya.id && (peran !== "admin" || !aktif)) gagal(kembali, "Peran dan status akun sendiri tidak bisa diubah dari sini.");
  if (id) {
    await jalankan("UPDATE pengguna SET nama = ?, username = ?, peran = ?, aktif = ? WHERE id = ?", nama, username, peran, aktif, id);
    if (sandi) {
      // Ganti kata sandi atau menonaktifkan akun mencabut semua sesinya dan melupakan perangkat yang dikenal.
      await jalankan("UPDATE pengguna SET sandi = ? WHERE id = ?", hashSandi(sandi), id);
      await lupakanPerangkat(id);
      // Akun sendiri tetap masuk di perangkat ini, sesi di perangkat lain dicabut.
      if (id !== saya.id) await jalankan("DELETE FROM sesi WHERE pengguna_id = ?", id);
      else {
        const token = (await cookies()).get(COOKIE_SESI)?.value;
        await cabutSesiLain(id, token ? hashToken(token) : null);
      }
    }
    if (!aktif) {
      await jalankan("DELETE FROM sesi WHERE pengguna_id = ?", id);
      await lupakanPerangkat(id);
    }
    await catatLog(saya, "Ubah pengguna", `${username}, peran ${peran}, ${aktif ? "aktif" : "nonaktif"}${sandi ? ", kata sandi diganti" : ""}`);
  } else {
    await jalankan("INSERT INTO pengguna (nama, username, sandi, peran) VALUES (?, ?, ?, ?)", nama, username, hashSandi(sandi), peran);
    await catatLog(saya, "Tambah pengguna", `${username}, peran ${peran}`);
  }
  redirect(`${kembali}?ok=1`);
}
