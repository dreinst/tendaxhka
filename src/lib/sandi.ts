import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashSandi(sandi: string): string {
  const garam = randomBytes(16);
  return `${garam.toString("hex")}:${scryptSync(sandi, garam, 64).toString("hex")}`;
}

export function cocokSandi(sandi: string, tersimpan: string): boolean {
  const [garam, hash] = tersimpan.split(":");
  if (!garam || !hash) return false;
  const uji = scryptSync(sandi, Buffer.from(garam, "hex"), 64);
  const asli = Buffer.from(hash, "hex");
  return asli.length === uji.length && timingSafeEqual(asli, uji);
}

// Saat username tidak ditemukan, kata sandi tetap dicocokkan ke hash palsu ini. Tanpanya, jawaban untuk
// username yang tidak ada datang lebih cepat dan membocorkan username mana yang terdaftar.
let hashPalsu: string | undefined;

export function cocokSandiPalsu(sandi: string): false {
  hashPalsu ??= hashSandi(randomBytes(16).toString("hex"));
  cocokSandi(sandi, hashPalsu);
  return false;
}

// Cookie membawa token acak. Basis data hanya menyimpan hash-nya.
export function tokenBaru(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Membandingkan dua teks rahasia dengan waktu yang sama, berapa pun panjangnya.
export function samaAman(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Sesi untuk mode demo. Di Vercel, halaman bisa dilayani beberapa server yang masing-masing punya basis data
// /tmp sendiri, jadi sesi yang disimpan di basis data hilang saat pindah halaman. Di mode demo, isi sesi
// (username dan batas waktu) disimpan di cookie dan ditandatangani HMAC, sehingga setiap server bisa
// memeriksanya tanpa basis data. Bentuk token: payload base64url, titik, tanda tangan base64url.
export function tokenSesiDemo(username: string, kedaluwarsa: number, rahasia: string): string {
  const isi = Buffer.from(JSON.stringify({ u: username, e: kedaluwarsa })).toString("base64url");
  return `${isi}.${createHmac("sha256", rahasia).update(isi).digest("base64url")}`;
}

export function bacaSesiDemo(token: string, rahasia: string, kini: number): string | null {
  const [isi, tanda] = token.split(".");
  if (!isi || !tanda) return null;
  const benar = createHmac("sha256", rahasia).update(isi).digest();
  const kiriman = Buffer.from(tanda, "base64url");
  if (kiriman.length !== benar.length || !timingSafeEqual(kiriman, benar)) return null;
  try {
    const data = JSON.parse(Buffer.from(isi, "base64url").toString("utf8")) as { u?: unknown; e?: unknown };
    if (typeof data.u !== "string" || typeof data.e !== "number" || data.e <= kini) return null;
    return data.u;
  } catch {
    return null;
  }
}
