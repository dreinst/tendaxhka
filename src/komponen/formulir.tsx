import { Bidang } from "@/komponen/ui";
import { simpanKontak, simpanPesanan } from "@/lib/aksi";
import type { Aset, BarisPesanan, Kontak, Pesanan } from "@/lib/data";
import { LABEL_TAHAP, rupiah } from "@/lib/format";

export function FormKontak({ kontak: k }: { kontak?: Kontak }) {
  return (
    <form action={simpanKontak} className="grid gap-3 md:grid-cols-2">
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
      <Bidang label="Kebutuhan dan catatan" id="kebutuhan" className="md:col-span-2">
        <textarea className="isian" id="kebutuhan" name="kebutuhan" rows={3} maxLength={2000} defaultValue={k?.kebutuhan} />
      </Bidang>
      <div className="md:col-span-2">
        <button className="tombol tombol-utama">{k ? "Simpan perubahan" : "Tambah kontak"}</button>
      </div>
    </form>
  );
}

const BARIS_KOSONG = 4;

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
  const isi: (BarisPesanan | null)[] = [...baris, ...Array<null>(BARIS_KOSONG).fill(null)];
  return (
    <form action={simpanPesanan} className="space-y-4">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-3 md:grid-cols-2">
        <Bidang label="Pelanggan" id="kontak_id">
          <select className="isian" id="kontak_id" name="kontak_id" required defaultValue={p?.kontak_id ?? kontakId ?? ""}>
            <option value="">Pilih pelanggan</option>
            {kontak.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}{k.perusahaan && ` (${k.perusahaan})`}</option>
            ))}
          </select>
        </Bidang>
        <Bidang label="Nama acara" id="acara">
          <input className="isian" id="acara" name="acara" required maxLength={160} defaultValue={p?.acara} />
        </Bidang>
        <Bidang label="Tanggal pasang" id="mulai">
          <input className="isian" id="mulai" name="mulai" type="date" required defaultValue={p?.mulai} />
        </Bidang>
        <Bidang label="Tanggal bongkar" id="selesai">
          <input className="isian" id="selesai" name="selesai" type="date" required defaultValue={p?.selesai} />
        </Bidang>
        <Bidang label="Lokasi" id="lokasi" className="md:col-span-2">
          <input className="isian" id="lokasi" name="lokasi" maxLength={300} defaultValue={p?.lokasi} />
        </Bidang>
      </div>

      <div className="overflow-x-auto">
        <table className="tabel min-w-[46rem]">
          <thead>
            <tr>
              <th scope="col">Aset</th>
              <th scope="col">Keterangan di dokumen</th>
              <th scope="col">Jumlah</th>
              <th scope="col">Hari</th>
              <th scope="col">Harga satuan</th>
            </tr>
          </thead>
          <tbody>
            {isi.map((b, i) => (
              <tr key={b?.id ?? `baru-${i}`}>
                <td>
                  <select className="isian" name="b_aset" aria-label={`Aset baris ${i + 1}`} defaultValue={b?.aset_id ?? ""}>
                    <option value="">Jasa atau biaya lain</option>
                    {aset.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nama} {a.ukuran} ({rupiah(a.harga)}, punya {a.jumlah})
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input className="isian" name="b_deskripsi" aria-label={`Keterangan baris ${i + 1}`} maxLength={200} defaultValue={b?.deskripsi} />
                </td>
                <td className="w-24">
                  <input className="isian" name="b_jumlah" aria-label={`Jumlah baris ${i + 1}`} type="number" min={0} defaultValue={b?.jumlah ?? ""} />
                </td>
                <td className="w-20">
                  <input className="isian" name="b_hari" aria-label={`Hari baris ${i + 1}`} type="number" min={1} defaultValue={b?.hari ?? 1} />
                </td>
                <td className="w-36">
                  <input className="isian" name="b_harga" aria-label={`Harga baris ${i + 1}`} inputMode="numeric" defaultValue={b?.harga ?? ""} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-tinta-lembut">
        Baris tanpa jumlah diabaikan. Keterangan dan harga yang dikosongkan diisi dari data aset. Untuk menghapus baris, nolkan jumlahnya.
        Simpan dulu kalau butuh baris tambahan.
      </p>

      <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
        <Bidang label="Diskon (Rp)" id="diskon">
          <input className="isian" id="diskon" name="diskon" inputMode="numeric" defaultValue={p?.diskon || ""} />
        </Bidang>
        <Bidang label="Catatan di dokumen" id="catatan">
          <input className="isian" id="catatan" name="catatan" maxLength={2000} defaultValue={p?.catatan} />
        </Bidang>
      </div>
      <button className="tombol tombol-utama">{p ? "Simpan perubahan" : "Simpan penawaran"}</button>
    </form>
  );
}
