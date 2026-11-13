"use client";

export function TombolCetak() {
  return (
    <button type="button" className="tombol tombol-utama" onClick={() => window.print()}>
      Cetak atau simpan PDF
    </button>
  );
}
