import type { Metadata } from "next";
import { MenuSistem } from "@/komponen/menu-sistem";
import { keluar } from "@/lib/aksi";
import { wajib } from "@/lib/auth";
import { LABEL_PERAN } from "@/lib/format";
import { boleh, type Hak } from "@/lib/hitung";

export const metadata: Metadata = { title: { default: "Sistem", template: "%s | Sistem Tenda Indonesia" }, robots: { index: false, follow: false } };

const MENU: { href: string; teks: string; hak?: Hak }[] = [
  { href: "/sistem", teks: "Dasbor" },
  { href: "/sistem/kontak", teks: "CRM", hak: "kontak.lihat" },
  { href: "/sistem/pesanan", teks: "Pesanan", hak: "pesanan.lihat" },
  { href: "/sistem/kalender", teks: "Kalender aset", hak: "aset.lihat" },
  { href: "/sistem/jadwal", teks: "Jadwal kru", hak: "jadwal.lihat" },
  { href: "/sistem/aset", teks: "Aset dan katalog", hak: "aset.lihat" },
  { href: "/sistem/keuangan", teks: "Keuangan", hak: "keuangan.lihat" },
  { href: "/sistem/bagi-hasil", teks: "Bagi hasil", hak: "keuangan.lihat" },
  { href: "/sistem/log", teks: "Jejak audit", hak: "keuangan.lihat" },
  { href: "/sistem/pengaturan", teks: "Pengaturan", hak: "pengaturan" },
];

export default async function LayoutSistem({ children }: { children: React.ReactNode }) {
  const u = await wajib();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[14rem_1fr]">
      <MenuSistem
        menu={MENU.filter((m) => !m.hak || boleh(u.peran, m.hak)).map(({ href, teks }) => ({ href, teks }))}
        nama={u.nama}
        peran={LABEL_PERAN[u.peran]}
        keluar={
          <form action={keluar} className="mt-2">
            <button className="tombol tombol-terang min-h-11 w-full">Keluar</button>
          </form>
        }
      />
      <main className="min-w-0 p-4 md:p-7">{children}</main>
    </div>
  );
}
