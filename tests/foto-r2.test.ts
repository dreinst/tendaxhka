import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, test } from "node:test";

// Server tiruan yang berperilaku seperti API S3 untuk satu bucket: menyimpan objek di memori dan mencatat
// setiap permintaan. Tanda tangannya tidak dihitung ulang di sini (itu diuji di s3.test.ts terhadap contoh
// AWS), yang diperiksa adalah alamat, header, dan cara foto.ts menanggapi tiap status.
const objek = new Map<string, Buffer>();
const catatan: { method: string; url: string; kepala: Record<string, string | string[] | undefined> }[] = [];
let paksaStatus = 0;
const server = createServer((req, res) => {
  const potongan: Buffer[] = [];
  req.on("data", (p: Buffer) => potongan.push(p));
  req.on("end", () => {
    catatan.push({ method: req.method ?? "", url: req.url ?? "", kepala: req.headers });
    if (paksaStatus) return void res.writeHead(paksaStatus).end();
    const kunci = req.url ?? "";
    if (req.method === "PUT") {
      objek.set(kunci, Buffer.concat(potongan));
      return void res.writeHead(200).end();
    }
    if (req.method === "GET") {
      const isi = objek.get(kunci);
      return void (isi ? res.writeHead(200, { "content-type": "image/jpeg" }).end(isi) : res.writeHead(404).end());
    }
    if (req.method === "DELETE") {
      objek.delete(kunci);
      return void res.writeHead(204).end();
    }
    res.writeHead(405).end();
  });
});
await new Promise<void>((siap) => server.listen(0, "127.0.0.1", siap));
const port = (server.address() as AddressInfo).port;
after(() => server.close());

process.env.DB_PATH = ":memory:";
process.env.R2_ENDPOINT = `http://127.0.0.1:${port}/`;
process.env.R2_BUCKET = "bucket-uji";
process.env.R2_ACCESS_KEY_ID = "kunci-uji";
process.env.R2_SECRET_ACCESS_KEY = "rahasia-uji";

const { bacaBerkasFoto, hapusBerkasFoto, simpanBerkasFoto } = await import("../src/lib/foto.ts");

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);

test("foto disimpan, dibaca, dan dihapus lewat API S3 dengan alamat bucket/foto/nama", async () => {
  const nama = await simpanBerkasFoto(jpeg);
  assert.match(nama, /^[0-9a-f]{32}\.jpg$/);
  const kirim = catatan.at(-1)!;
  assert.equal(kirim.method, "PUT");
  assert.equal(kirim.url, `/bucket-uji/foto/${nama}`);
  assert.equal(kirim.kepala["content-type"], "image/jpeg");
  assert.match(String(kirim.kepala.authorization), /^AWS4-HMAC-SHA256 Credential=kunci-uji\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);
  assert.match(String(kirim.kepala["x-amz-content-sha256"]), /^[0-9a-f]{64}$/);
  assert.deepEqual(objek.get(`/bucket-uji/foto/${nama}`), Buffer.from(jpeg));

  assert.deepEqual(await bacaBerkasFoto(nama), jpeg);
  assert.equal(catatan.at(-1)!.method, "GET");

  await hapusBerkasFoto(nama);
  assert.equal(catatan.at(-1)!.method, "DELETE");
  assert.equal(objek.size, 0);
  assert.equal(await bacaBerkasFoto(nama), null);
});

test("nama yang tidak sah tidak pernah sampai ke R2", async () => {
  const sebelum = catatan.length;
  assert.equal(await bacaBerkasFoto("../rahasia.jpg"), null);
  assert.equal(await bacaBerkasFoto("foto.png"), null);
  await hapusBerkasFoto("../../etc/passwd");
  assert.equal(catatan.length, sebelum);
});

test("R2 yang menolak membuat unggahan dan pembacaan gagal dengan jelas, tetapi penghapusan tidak menggagalkan aksi", async (t) => {
  paksaStatus = 403;
  t.after(() => (paksaStatus = 0));
  await assert.rejects(simpanBerkasFoto(jpeg), /R2 menolak unggahan foto \(status 403\)/);
  await assert.rejects(bacaBerkasFoto(`${"a".repeat(32)}.jpg`), /R2 gagal memberikan foto \(status 403\)/);
  const galat = t.mock.method(console, "error", () => {});
  await hapusBerkasFoto(`${"a".repeat(32)}.jpg`);
  assert.equal(galat.mock.callCount(), 1);
});

test("pengaturan R2 yang setengah terisi ditolak, tidak diam-diam memakai disk", async (t) => {
  const lama = process.env.R2_BUCKET;
  delete process.env.R2_BUCKET;
  t.after(() => (process.env.R2_BUCKET = lama));
  await assert.rejects(simpanBerkasFoto(jpeg), /Pengaturan R2 belum lengkap\. Yang masih kosong: R2_BUCKET\./);
});
