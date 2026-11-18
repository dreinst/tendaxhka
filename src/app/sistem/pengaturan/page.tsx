import type { Metadata } from "next";
import { JagaIsian } from "@/komponen/jaga-isian";
import { Panel } from "@/komponen/panel";
import { Bidang, JudulKartu, Kepala, Lencana, nilai, Pesan, type Cari } from "@/komponen/ui";
import { simpanPengaturan, simpanPengguna } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import { pengaturan, type Pengguna } from "@/lib/data";
import { semua } from "@/lib/db";
import { LABEL_PERAN } from "@/lib/format";
import { bacaJarakPenawaran, JARAK_PENAWARAN_MAKS } from "@/lib/hitung";

export const metadata: Metadata = { title: "Pengaturan" };

// Formulir satu pengguna, ditaruh di dalam Panel. Tanpa `p` berarti pengguna baru (id isian berakhiran "-baru").
function FormPengguna({ p }: { p?: Pengguna }) {
  const k = p?.id ?? "baru";
  return (
    <form action={simpanPengguna} className="grid gap-3">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Bidang label="Nama" id={`nama-${k}`}>
        <input className="isian" id={`nama-${k}`} name="nama" required maxLength={80} defaultValue={p?.nama} />
      </Bidang>
      <Bidang label="Nama pengguna" id={`username-${k}`}>
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
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="aktif" defaultChecked={p ? !!p.aktif : true} className="size-5" /> Aktif
      </label>
      <div className="pt-1">
        <button className="tombol tombol-utama">{p ? "Simpan" : "Tambah"}</button>
      </div>
    </form>
  );
}

export default async function Pengaturan({ searchParams }: { searchParams: Cari }) {
  await wajib("pengaturan");
  const sp = await searchParams;
  const [s, pengguna] = await Promise.all([
    pengaturan(),
    semua<Pengguna>("SELECT id, nama, username, peran, aktif FROM pengguna ORDER BY aktif DESC, nama"),
  ]);
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
          <Bidang label="Nomor WhatsApp, kalau beda dari telepon" id="whatsapp">
            <input className="isian" id="whatsapp" name="whatsapp" maxLength={30} inputMode="tel" placeholder="Kosongkan untuk memakai nomor telepon" defaultValue={s.whatsapp} />
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

        <section className="kartu flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="min-w-0 flex-1 basis-80">
            <h2 className="text-sm font-bold">Aturan penawaran</h2>
            <p className="mt-1 text-xs text-tinta-lembut">
              Pemasangan biasanya paling lambat sehari sebelum acara, jadi tanggal pasang tidak boleh terlalu dekat dari hari penawaran dibuat.
              Isi 0 untuk mematikan aturan. Berlaku untuk penawaran baru, pesan ulang, dan formulir di website.
            </p>
          </div>
          <Bidang label="Jarak minimal penawaran ke tanggal pasang, hari" id="jarak_penawaran_hari" className="w-full sm:w-64">
            <input
              className="isian"
              id="jarak_penawaran_hari"
              name="jarak_penawaran_hari"
              type="number"
              inputMode="numeric"
              min={0}
              max={JARAK_PENAWARAN_MAKS}
              step={1}
              required
              defaultValue={bacaJarakPenawaran(s.jarak_penawaran_hari)}
            />
          </Bidang>
        </section>

        <section className="kartu flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="min-w-0 flex-1 basis-80">
            <h2 className="text-sm font-bold">Akses peran gudang</h2>
            <p className="mt-1 text-xs text-tinta-lembut">
              Gudang selalu melihat barang, jumlah, tanggal, dan lokasi pesanan. Harga, total, pembayaran, dan dokumen cetak (yang memuat telepon
              dan email pelanggan) baru terlihat kalau dibuka di sini.
            </p>
          </div>
          <Bidang label="Harga dan dokumen cetak untuk gudang" id="gudang_lihat_nilai" className="w-full sm:w-64">
            <select className="isian" id="gudang_lihat_nilai" name="gudang_lihat_nilai" defaultValue={s.gudang_lihat_nilai}>
              <option value="tidak">Tertutup</option>
              <option value="ya">Terbuka</option>
            </select>
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
        <div className="flex flex-wrap items-center gap-3">
          <button className="tombol tombol-utama">Simpan pengaturan</button>
          <JagaIsian kunci="pengaturan" />
        </div>
      </form>

      <section className="kartu mt-6 p-4">
        <JudulKartu judul="Pengguna">
          <Panel tombol="Pengguna baru" judul="Pengguna baru" kelasTombol="tombol tombol-tinta">
            <FormPengguna />
          </Panel>
        </JudulKartu>
        <p className="-mt-1 mb-3 text-xs text-tinta-lembut">
          Admin mengatur semuanya. Sales memegang CRM dan pesanan. Gudang memegang aset dan jadwal. Kru mencentang checklist. Partner hanya melihat,
          termasuk keuangan dan bagi hasil.
        </p>
        <table className="tabel tabel-susun md:[&_td]:align-middle">
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col">Nama pengguna</th>
              <th scope="col">Peran</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {pengguna.map((p) => (
              <tr key={p.id}>
                <th scope="row">{p.nama}</th>
                <td className="text-tinta-lembut md:text-tinta">
                  {p.username}
                  <span className="md:hidden">, {LABEL_PERAN[p.peran]}</span>
                </td>
                <td className="susun-sembunyi">{LABEL_PERAN[p.peran]}</td>
                <td className="susun-kanan">{p.aktif ? <Lencana nilai="selesai" teks="Aktif" /> : <Lencana nilai="batal" teks="Nonaktif" />}</td>
                <td className="susun-kanan w-px py-1 align-middle">
                  <Panel tombol="Ubah" labelTombol={`Ubah pengguna ${p.nama}`} judul={`Ubah pengguna ${p.nama}`} kelasTombol="tombol tombol-kecil">
                    <FormPengguna p={p} />
                  </Panel>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
