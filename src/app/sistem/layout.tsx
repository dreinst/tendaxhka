import type { Metadata } from "next";
import Link from "next/link";
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
      <aside className="tanpa-cetak bg-tinta text-white md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="border-b border-white/10 px-4 pb-3 pt-4">
          <Link href="/sistem" className="font-judul text-sm font-bold">
            Tenda Indonesia
          </Link>
          <p className="text-xs text-white/60">bersama HKA Management</p>
        </div>
        <nav aria-label="Menu sistem" className="flex gap-1 overflow-x-auto px-2 py-2 md:block md:space-y-1">
          {MENU.filter((m) => !m.hak || boleh(u.peran, m.hak)).map((m) => (
            <Link key={m.href} href={m.href} className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
              {m.teks}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/15 px-4 py-3 text-xs">
          <p className="font-semibold">{u.nama}</p>
          <p className="text-white/60">{LABEL_PERAN[u.peran]}</p>
          <form action={keluar} className="mt-2">
            <button className="underline underline-offset-2 hover:text-lampu">Keluar</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-7">{children}</main>
    </div>
  );
}
