"use client";

import { useRef, useState } from "react";
import { tambahFoto } from "@/lib/aksi";
import { MAKS_UKURAN_FOTO } from "@/lib/hitung";

// Foto disimpan dalam kualitas HD: sisi terpanjangnya 1920 piksel. Foto yang lebih besar dikecilkan di browser
// sebelum dikirim, yang lebih kecil dibiarkan apa adanya. Hasilnya JPEG sekitar 300 sampai 900 KB. Pengunjung
// tidak mengunduh berkas ini utuh, karena halaman mengirim ukuran yang pas untuk tiap layar.
const SISI_MAKS = 1920;
// Mutu JPEG dicoba dari yang tertinggi dan diturunkan hanya kalau hasilnya melewati batas ukuran di server.
const MUTU = [0.88, 0.8, 0.72];

async function siapkan(berkas: File): Promise<Blob> {
  const gambar = await createImageBitmap(berkas);
  const skala = Math.min(1, SISI_MAKS / Math.max(gambar.width, gambar.height));
  const kanvas = document.createElement("canvas");
  kanvas.width = Math.round(gambar.width * skala);
  kanvas.height = Math.round(gambar.height * skala);
  const ctx = kanvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(gambar, 0, 0, kanvas.width, kanvas.height);
  gambar.close();
  const jadi = (mutu: number) => new Promise<Blob>((selesai, gagal) => kanvas.toBlob((b) => (b ? selesai(b) : gagal(new Error("gagal"))), "image/jpeg", mutu));
  let hasil = await jadi(MUTU[0]);
  for (const mutu of MUTU.slice(1)) {
    if (hasil.size <= MAKS_UKURAN_FOTO) break;
    hasil = await jadi(mutu);
  }
  return hasil;
}

export function UnggahFoto({ asetId, sisa }: { asetId: number; sisa: number }) {
  const masukan = useRef<HTMLInputElement>(null);
  const [seret, setSeret] = useState(false);
  const [status, setStatus] = useState("");
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);

  async function kirim(daftar: FileList | null) {
    const foto = [...(daftar ?? [])].filter((f) => f.type.startsWith("image/"));
    if (foto.length === 0 || sibuk) return;
    setSibuk(true);
    setGalat("");
    const gagal: string[] = [];
    for (const [i, f] of foto.slice(0, sisa).entries()) {
      setStatus(`Mengunggah foto ${i + 1} dari ${Math.min(foto.length, sisa)}`);
      try {
        const fd = new FormData();
        fd.set("foto", await siapkan(f), "foto.jpg");
        const hasil = await tambahFoto(asetId, fd);
        if (hasil.galat) gagal.push(`${f.name}: ${hasil.galat}`);
      } catch {
        gagal.push(`${f.name}: tidak bisa dibaca sebagai foto.`);
      }
    }
    if (foto.length > sisa) gagal.push(`${foto.length - sisa} foto dilewati karena melebihi batas.`);
    setStatus("");
    setGalat(gagal.join(" "));
    setSibuk(false);
    if (masukan.current) masukan.current.value = "";
  }

  if (sisa <= 0) return <p className="text-xs text-tinta-lembut">Batas jumlah foto sudah tercapai. Hapus salah satu untuk menambah yang baru.</p>;
  return (
    <div>
      <label
        htmlFor="unggah-foto"
        onDragOver={(e) => {
          e.preventDefault();
          setSeret(true);
        }}
        onDragLeave={() => setSeret(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSeret(false);
          void kirim(e.dataTransfer.files);
        }}
        className={`grid cursor-pointer gap-1 rounded-[10px] border-2 border-dashed px-4 py-5 text-center text-sm ${seret ? "border-terpal bg-[#fdeeeb]" : "border-[#c9bca3] bg-white"}`}
      >
        <span className="font-semibold">{sibuk ? status : "Klik untuk memilih foto, atau seret ke sini"}</span>
        <span className="text-xs text-tinta-lembut">JPG atau PNG, bisa beberapa sekaligus. Disimpan dalam kualitas HD (1920 piksel). Sisa tempat: {sisa} foto.</span>
      </label>
      <input ref={masukan} id="unggah-foto" type="file" accept="image/*" multiple className="sr-only" disabled={sibuk} onChange={(e) => void kirim(e.target.files)} />
      {galat && (
        <p role="alert" className="mt-2 text-xs font-medium text-terpal-gelap">
          {galat}
        </p>
      )}
    </div>
  );
}
