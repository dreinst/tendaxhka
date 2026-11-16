import { Bidang } from "@/komponen/ui";
import { simpanAset } from "@/lib/aksi";
import type { Aset } from "@/lib/data";

export function FormAset({ aset: a }: { aset?: Aset }) {
  return (
    <form action={simpanAset} className="grid gap-3 md:grid-cols-4">
      {a && <input type="hidden" name="id" value={a.id} />}
      <Bidang label="Kode" id="kode">
        <input className="isian" id="kode" name="kode" required maxLength={20} defaultValue={a?.kode} />
      </Bidang>
      <Bidang label="Nama" id="nama" className="md:col-span-2">
        <input className="isian" id="nama" name="nama" required maxLength={120} defaultValue={a?.nama} />
      </Bidang>
      <Bidang label="Ukuran" id="ukuran">
        <input className="isian" id="ukuran" name="ukuran" maxLength={40} placeholder="5x5 m" defaultValue={a?.ukuran} />
      </Bidang>
      <Bidang label="Kategori" id="kategori">
        <input className="isian" id="kategori" name="kategori" required maxLength={60} placeholder="Tenda, lantai, kursi" defaultValue={a?.kategori} />
      </Bidang>
      <Bidang label="Jumlah dimiliki" id="jumlah">
        <input className="isian" id="jumlah" name="jumlah" type="number" min={0} required defaultValue={a?.jumlah ?? 1} />
      </Bidang>
      <Bidang label="Satuan" id="satuan">
        <input className="isian" id="satuan" name="satuan" maxLength={20} defaultValue={a?.satuan ?? "unit"} />
      </Bidang>
      <Bidang label="Harga sewa per hari (Rp)" id="harga">
        <input className="isian" id="harga" name="harga" inputMode="numeric" defaultValue={a?.harga ?? ""} />
      </Bidang>
      <Bidang label="Kapasitas (opsional)" id="kapasitas" className="md:col-span-2">
        <input className="isian" id="kapasitas" name="kapasitas" maxLength={60} placeholder="sekitar 30 kursi" defaultValue={a?.kapasitas} />
      </Bidang>
      <Bidang label="Cocok untuk (opsional)" id="cocok" className="md:col-span-2">
        <input className="isian" id="cocok" name="cocok" maxLength={80} placeholder="hajatan, bazar, pameran" defaultValue={a?.cocok} />
      </Bidang>
      <Bidang label="Deskripsi singkat untuk website" id="deskripsi" className="md:col-span-4">
        <input className="isian" id="deskripsi" name="deskripsi" maxLength={300} defaultValue={a?.deskripsi} />
      </Bidang>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="tampil_web" defaultChecked={a ? !!a.tampil_web : true} className="size-4" /> Tampilkan di katalog website
      </label>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="aktif" defaultChecked={a ? !!a.aktif : true} className="size-4" /> Aktif disewakan
      </label>
      <div className="md:col-span-4">
        <button className="tombol tombol-utama">{a ? "Simpan perubahan" : "Tambah aset"}</button>
      </div>
    </form>
  );
}
