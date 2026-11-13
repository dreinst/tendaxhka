import type { Metadata } from "next";
import { Bidang, Kepala, nilai, Pesan, type Cari } from "@/komponen/ui";
import { simpanPengaturan, simpanPengguna } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import { pengaturan, type Pengguna } from "@/lib/data";
import { semua } from "@/lib/db";
import { LABEL_PERAN } from "@/lib/format";

export const metadata: Metadata = { title: "Pengaturan" };

function FormPengguna({ p }: { p?: Pengguna }) {
  const k = p?.id ?? "baru";
  return (
    <form action={simpanPengguna} className="grid gap-2 md:grid-cols-5">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Bidang label="Nama" id={`nama-${k}`}>
        <input className="isian" id={`nama-${k}`} name="nama" required maxLength={80} defaultValue={p?.nama} />
      </Bidang>
      <Bidang label="Username" id={`username-${k}`}>
        <input className="isian" id={`username-${k}`} name="username" required maxLength={30} autoCapitalize="none" defaultValue={p?.username} />
      </Bidang>
      <Bidang label="Peran" id={`peran-${k}`}>
        <select className="isian" id={`peran-${k}`} name="peran" defaultValue={p?.peran ?? "kru"}>
          {Object.entries(LABEL_PERAN).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </Bidang>
      <Bidang label={p ? "Kata sandi baru (opsional)" : "Kata sandi"} id={`sandi-${k}`}>
        <input className="isian" id={`sandi-${k}`} name="sandi" type="password" minLength={8} required={!p} autoComplete="new-password" />
      </Bidang>
      <div className="flex items-end gap-3">
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="aktif" defaultChecked={p ? !!p.aktif : true} className="size-4" /> Aktif
        </label>
        <button className="tombol tombol-tinta">{p ? "Simpan" : "Tambah"}</button>
      </div>
    </form>
  );
}

export default async function Pengaturan({ searchParams }: { searchParams: Cari }) {
  await wajib("pengaturan");
  const sp = await searchParams;
  const s = pengaturan();
  const pengguna = semua<Pengguna>("SELECT id, nama, username, peran, aktif FROM pengguna ORDER BY aktif DESC, nama");
  return (
    <>
      <Kepala judul="Pengaturan" />
      <Pesan galat={nilai(sp.galat)} ok={nilai(sp.ok) ? "Perubahan tersimpan." : undefined} />
      <form action={simpanPengaturan} className="space-y-5">
        <section className="kartu grid gap-3 p-4 md:grid-cols-2">
          <h2 className="text-sm font-bold md:col-span-2">Identitas usaha</h2>
          <p className="-mt-2 text-xs text-tinta-lembut md:col-span-2">Dipakai di website, penawaran, dan faktur.</p>
          <Bidang label="Nama usaha" id="nama_usaha">
            <input className="isian" id="nama_usaha" name="nama_usaha" maxLength={80} defaultValue={s.nama_usaha} />
          </Bidang>
          <Bidang label="Telepon atau WhatsApp" id="telepon">
            <input className="isian" id="telepon" name="telepon" maxLength={30} defaultValue={s.telepon} />
          </Bidang>
          <Bidang label="Email" id="email">
            <input className="isian" id="email" name="email" type="email" maxLength={120} defaultValue={s.email} />
          </Bidang>
          <Bidang label="Rekening pembayaran" id="rekening">
            <input className="isian" id="rekening" name="rekening" maxLength={200} placeholder="Bank, nomor, atas nama" defaultValue={s.rekening} />
          </Bidang>
          <Bidang label="Alamat" id="alamat" className="md:col-span-2">
            <input className="isian" id="alamat" name="alamat" maxLength={300} defaultValue={s.alamat} />
          </Bidang>
        </section>

        <section className="kartu grid gap-3 p-4 md:grid-cols-4">
          <h2 className="text-sm font-bold md:col-span-4">Rumus bagi hasil</h2>
          <p className="-mt-2 text-xs text-tinta-lembut md:col-span-4">
            Isi sesuai perjanjian. Perubahan hanya berlaku untuk bulan yang belum ditutup.
          </p>
          <Bidang label="Basis pendapatan" id="basis">
            <select className="isian" id="basis" name="basis" defaultValue={s.basis}>
              <option value="kas">Kas (uang diterima)</option>
              <option value="akrual">Akrual (faktur terbit)</option>
            </select>
          </Bidang>
          <Bidang label="Pajak, % dari pendapatan" id="persen_pajak">
            <input className="isian" id="persen_pajak" name="persen_pajak" inputMode="decimal" defaultValue={s.persen_pajak} />
          </Bidang>
          <Bidang label="Cadangan, % dari laba" id="persen_cadangan">
            <input className="isian" id="persen_cadangan" name="persen_cadangan" inputMode="decimal" defaultValue={s.persen_cadangan} />
          </Bidang>
          <Bidang label="Porsi Tenda Indonesia, %" id="porsi_tenda">
            <input className="isian" id="porsi_tenda" name="porsi_tenda" inputMode="decimal" defaultValue={s.porsi_tenda} />
          </Bidang>
        </section>

        <section className="kartu grid gap-3 p-4 md:grid-cols-2">
          <h2 className="text-sm font-bold md:col-span-2">Checklist bawaan</h2>
          <p className="-mt-2 text-xs text-tinta-lembut md:col-span-2">Satu butir per baris. Dipasang ke tugas baru saat pesanan dibooking.</p>
          <Bidang label="Pasang" id="checklist_pasang">
            <textarea className="isian" id="checklist_pasang" name="checklist_pasang" rows={7} defaultValue={s.checklist_pasang} />
          </Bidang>
          <Bidang label="Bongkar" id="checklist_bongkar">
            <textarea className="isian" id="checklist_bongkar" name="checklist_bongkar" rows={7} defaultValue={s.checklist_bongkar} />
          </Bidang>
        </section>
        <button className="tombol tombol-utama">Simpan pengaturan</button>
      </form>

      <section className="kartu mt-6 space-y-4 p-4">
        <h2 className="text-sm font-bold">Pengguna</h2>
        <p className="-mt-2 text-xs text-tinta-lembut">
          Admin mengatur semuanya. Sales memegang CRM dan pesanan. Gudang memegang aset dan jadwal. Kru mencentang checklist. Partner hanya melihat,
          termasuk keuangan dan bagi hasil.
        </p>
        {pengguna.map((p) => (
          <div key={p.id} className="ceruk p-3"><FormPengguna p={p} /></div>
        ))}
        <div className="border-t border-garis pt-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-tinta-lembut">Pengguna baru</h3>
          <FormPengguna />
        </div>
      </section>
    </>
  );
}
