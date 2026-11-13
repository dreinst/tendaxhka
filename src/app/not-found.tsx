import Link from "next/link";

export default function TidakDitemukan() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-tinta-lembut">Alamatnya mungkin salah atau datanya sudah dihapus.</p>
        <Link href="/" className="tombol tombol-utama mt-5">Ke beranda</Link>
      </div>
    </main>
  );
}
