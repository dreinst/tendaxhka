// Urutan kategori di website: tenda lebih dulu, kategori lain menurut abjad.
export function urutKategori(daftar: string[]): string[] {
  const tenda = (k: string) => Number(k.toLowerCase().includes("tenda"));
  return [...new Set(daftar)].sort((a, b) => tenda(b) - tenda(a) || a.localeCompare(b));
}
