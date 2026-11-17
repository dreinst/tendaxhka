import assert from "node:assert/strict";
import { test } from "node:test";
import { HASH_KOSONG, hashIsi, tandaTanganS3 } from "../src/lib/s3.ts";

// Contoh dari dokumentasi AWS, "Signature Calculations for the Authorization Header: Transferring Payload in
// a Single Chunk (AWS Signature Version 4)". Kunci di bawah adalah kunci contoh milik dokumentasi itu.
const contoh = {
  kunci: "AKIAIOSFODNN7EXAMPLE",
  rahasia: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  wilayah: "us-east-1",
  waktu: new Date("2013-05-24T00:00:00Z"),
};

test("tanda tangan GET cocok dengan contoh AWS", () => {
  const kepala = tandaTanganS3({
    ...contoh,
    method: "GET",
    url: "https://examplebucket.s3.amazonaws.com/test.txt",
    kepala: { Range: "bytes=0-9" },
    hashIsi: HASH_KOSONG,
  });
  assert.equal(HASH_KOSONG, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(kepala["x-amz-date"], "20130524T000000Z");
  assert.equal(
    kepala.authorization,
    "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
  );
});

test("tanda tangan PUT cocok dengan contoh AWS, termasuk nama objek berkarakter khusus", () => {
  const isi = new TextEncoder().encode("Welcome to Amazon S3.");
  assert.equal(hashIsi(isi), "44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072");
  const kepala = tandaTanganS3({
    ...contoh,
    method: "PUT",
    url: "https://examplebucket.s3.amazonaws.com/test$file.text",
    kepala: { Date: "Fri, 24 May 2013 00:00:00 GMT", "x-amz-storage-class": "REDUCED_REDUNDANCY" },
    hashIsi: hashIsi(isi),
  });
  assert.match(kepala.authorization, /SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class, /);
  assert.match(kepala.authorization, /Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd$/);
});

test("tanda tangan permintaan berkueri cocok dengan contoh AWS", () => {
  const kepala = tandaTanganS3({
    ...contoh,
    method: "GET",
    url: "https://examplebucket.s3.amazonaws.com/?max-keys=2&prefix=J",
    hashIsi: HASH_KOSONG,
  });
  assert.match(kepala.authorization, /Signature=34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7$/);
});
