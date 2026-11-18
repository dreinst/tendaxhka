import { BarisBarang } from "@/komponen/baris-barang";
import { JagaIsian } from "@/komponen/jaga-isian";
import { Bidang } from "@/komponen/ui";
import { simpanKontak, simpanPesanan } from "@/lib/aksi";
import type { Aset, BarisPesanan, Kontak, Pesanan } from "@/lib/data";
import { LABEL_TAHAP } from "@/lib/format";

export function FormKontak({ kontak: k }: { kontak?: Kontak }) {
  return (
    <div className="@container">
    <form action={simpanKontak} className="grid gap-3 @lg:grid-cols-2">
      {k && <input type="hidden" name="id" value={k.id} />}
      <Bidang label="Nama" id="nama">
        <input className="isian" id="nama" name="nama" required maxLength={80} defaultValue={k?.nama} />
      </Bidang>
      <Bidang label="Perusahaan atau instansi" id="perusahaan">
        <input className="isian" id="perusahaan" name="perusahaan" maxLength={120} defaultValue={k?.perusahaan} />
      </Bidang>
      <Bidang label="Telepon atau WhatsApp" id="telepon">
        <input className="isian" id="telepon" name="telepon" inputMode="tel" maxLength={30} defaultValue={k?.telepon} />
      </Bidang>
      <Bidang label="Email" id="email">
        <input className="isian" id="email" name="email" type="email" maxLength={120} defaultValue={k?.email} />
      </Bidang>
      <Bidang label="Jenis" id="jenis">
        <select className="isian" id="jenis" name="jenis" defaultValue={k?.jenis ?? "perorangan"}>
          <option value="perorangan">Perorangan</option>
          <option value="korporat">Korporat</option>
        </select>
      </Bidang>
      <Bidang label="Sumber" id="sumber">
        <input className="isian" id="sumber" name="sumber" maxLength={60} placeholder="Instagram, rujukan, website" defaultValue={k?.sumber} />
      </Bidang>
      <Bidang label="Tahap" id="tahap">
        <select className="isian" id="tahap" name="tahap" defaultValue={k?.tahap ?? "baru"}>
          {Object.entries(LABEL_TAHAP).map(([v, t]) => (
            <option key={v} value={v}>{t}</option>
          ))}
        </select>
      </Bidang>
      <Bidang label="Tindak lanjut berikutnya" id="tindak_lanjut">
        <input className="isian" id="tindak_lanjut" name="tindak_lanjut" type="date" defaultValue={k?.tindak_lanjut ?? ""} />
      </Bidang>
      <Bidang label="Kebutuhan dan catatan" id="kebutuhan" className="@lg:col-span-2">
        <textarea className="isian" id="kebutuhan" name="kebutuhan" rows={3} maxLength={2000} defaultValue={k?.kebutuhan} />
      </Bidang>
      <div className="@lg:col-span-2">
        <button className="tombol tombol-utama">{k ? "Simpan perubahan" : "Tambah kontak"}</button>
      </div>
    </form>
    </div>
  );
}

export function FormPesanan({
  pesanan: p,
  baris,
  kontak,
  aset,
  kontakId,
}: {
  pesanan?: Pesanan;
  baris: BarisPesanan[];
  kontak: Kontak[];
  aset: Aset[];
  kontakId?: number;
}) {
  return (
    <form action={simpanPesanan} className="space-y-4">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Bidang label="Pelanggan" id="kontak_id" className="col-span-2 md:col-span-1">
          <select className="isian" id="kontak_id" name="kontak_id" required defaultValue={p?.kontak_id ?? kontakId ?? ""}>
            <option value="">Pilih pelanggan</option>
            {kontak.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}{k.perusahaan && ` (${k.perusahaan})`}</option>
            ))}
          </select>
        </Bidang>
        <Bidang label="Nama acara" id="acara" className="col-span-2 md:col-span-1">
          <input className="isian" id="acara" name="acara" required maxLength={160} defaultValue={p?.acara} />
        </Bidang>
        <Bidang label="Tanggal pasang" id="mulai">
          <input className="isian" id="mulai" name="mulai" type="date" required defaultValue={p?.mulai} />
        </Bidang>
        <Bidang label="Tanggal bongkar" id="selesai">
          <input className="isian" id="selesai" name="selesai" type="date" required defaultValue={p?.selesai} />
        </Bidang>
        <Bidang label="Lokasi" id="lokasi" className="col-span-2">
          <input className="isian" id="lokasi" name="lokasi" maxLength={300} defaultValue={p?.lokasi} />
        </Bidang>
      </div>

      <BarisBarang
        aset={aset.map((a) => ({
          id: a.id,
          nama: [a.nama, a.ukuran].filter(Boolean).join(" "),
          harga: a.harga,
          punya: a.jumlah,
        }))}
        awal={baris.map((b) => ({
          aset: b.aset_id ? String(b.aset_id) : "",
          deskripsi: b.deskripsi,
          jumlah: String(b.jumlah),
          hari: String(b.hari),
          harga: String(b.harga),
        }))}
      />
      <p className="text-xs text-tinta-lembut">Baris tanpa jumlah diabaikan. Keterangan dan harga yang dikosongkan diisi dari data aset.</p>

      <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
        <Bidang label="Diskon (Rp)" id="diskon">
          <input className="isian" id="diskon" name="diskon" inputMode="numeric" defaultValue={p?.diskon || ""} />
        </Bidang>
        <Bidang label="Catatan di dokumen" id="catatan">
          <input className="isian" id="catatan" name="catatan" maxLength={2000} defaultValue={p?.catatan} />
        </Bidang>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="tombol tombol-utama">{p ? "Simpan perubahan" : "Simpan penawaran"}</button>
        <JagaIsian kunci={p ? `pesanan-${p.id}` : "pesanan-baru"} />
      </div>
    </form>
  );
}
