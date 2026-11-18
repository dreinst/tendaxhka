import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JagaIsian } from "@/komponen/jaga-isian";
import { Bidang, nilai, Pesan, type Cari } from "@/komponen/ui";
import { masuk } from "@/lib/aksi";
import { penggunaSaatIni } from "@/lib/auth";
import { satu } from "@/lib/db";

export const metadata: Metadata = { title: "Masuk", robots: { index: false, follow: false } };

export default async function Masuk({ searchParams }: { searchParams: Cari }) {
  if (await penggunaSaatIni()) redirect("/sistem");
  const galat = nilai((await searchParams).galat);
  const pertama = !(await satu("SELECT 1 FROM pengguna LIMIT 1"));
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="kartu overflow-hidden">
          <div className="bg-tinta px-6 pb-5 pt-6 text-white">
            <p className="font-judul text-lg font-bold">Tenda Indonesia</p>
            <p className="mt-1 text-sm text-white/75">Sistem operasional bersama HKA Management</p>
          </div>
          <form action={masuk} className="space-y-4 px-6 pb-6 pt-4">
            <h1 className="text-base font-bold">{pertama ? "Buat akun admin pertama" : "Masuk"}</h1>
            <Pesan galat={galat} />
            {pertama && (
              <>
                <p className="text-xs text-tinta/70">Belum ada akun. Isi kode penyiapan (SETUP_TOKEN di berkas .env server) untuk membuat admin pertama.</p>
                <Bidang label="Kode penyiapan" id="kode">
                  <input className="isian" id="kode" name="kode" type="password" required autoComplete="off" />
                </Bidang>
                <Bidang label="Nama" id="nama">
                  <input className="isian" id="nama" name="nama" required maxLength={80} autoComplete="name" />
                </Bidang>
              </>
            )}
            <Bidang label="Nama pengguna" id="username">
              <input className="isian" id="username" name="username" required autoComplete="username" autoCapitalize="none" />
            </Bidang>
            <Bidang label="Kata sandi" id="sandi">
              <input className="isian" id="sandi" name="sandi" type="password" required minLength={pertama ? 8 : undefined} autoComplete={pertama ? "new-password" : "current-password"} />
            </Bidang>
            <button className="tombol tombol-utama w-full">{pertama ? "Buat akun dan masuk" : "Masuk"}</button>
            {/* Mengembalikan nama dan username kalau masuk gagal. Kata sandi dan kode penyiapan tidak pernah disimpan. */}
            <JagaIsian kunci="masuk" />
          </form>
        </div>
      </div>
    </main>
  );
}
