import { NextResponse, type NextRequest } from "next/server";

// Saringan awal tanpa basis data: tanpa cookie sesi langsung ke halaman masuk.
// Keabsahan sesi dan hak akses tetap diperiksa wajib() di setiap halaman dan aksi.
export function proxy(req: NextRequest) {
  if (req.cookies.has("sesi_tenda")) return NextResponse.next();
  return NextResponse.redirect(new URL("/masuk", req.url));
}

export const config = { matcher: ["/sistem/:path*", "/cetak/:path*"] };
