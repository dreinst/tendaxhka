import type { Metadata } from "next";
import { FormPesanan } from "@/komponen/formulir";
import { Kepala, nilai, Pesan, type Cari } from "@/komponen/ui";
import { wajib } from "@/lib/auth";
import { pengaturan, type Aset, type Kontak } from "@/lib/data";
import { semua } from "@/lib/db";
import { hariIni } from "@/lib/format";
import { bacaJarakPenawaran } from "@/lib/hitung";

export const metadata: Metadata = { title: "Penawaran baru" };

export default async function PenawaranBaru({ searchParams }: { searchParams: Cari }) {
  await wajib("pesanan.tulis");
  const sp = await searchParams;
  const [kontak, aset, s] = await Promise.all([
    semua<Kontak>("SELECT * FROM kontak WHERE tahap <> 'kalah' ORDER BY nama"),
    semua<Aset>("SELECT * FROM aset WHERE aktif = 1 ORDER BY kategori, nama, ukuran"),
    pengaturan(),
  ]);
  return (
    <>
      <Kepala judul="Penawaran baru" ket="Penawaran belum mengunci aset. Aset baru dikunci saat pesanan dibooking." />
      <Pesan galat={nilai(sp.galat)} />
      <div className="kartu p-4">
        <FormPesanan
          baris={[]}
          kontak={kontak}
          aset={aset}
          hari={hariIni()}
          jarak={bacaJarakPenawaran(s.jarak_penawaran_hari)}
          kontakId={Number(nilai(sp.kontak)) || undefined}
        />
      </div>
    </>
  );
}
