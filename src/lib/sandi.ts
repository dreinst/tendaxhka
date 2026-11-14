import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

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
