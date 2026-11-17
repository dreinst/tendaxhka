import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Semua akses basis data asinkron. Promise yang lupa di-await bisa membuat pernyataan jalan sesudah
  // transaksinya ditutup, atau membuat kondisi seperti if (satu(...)) selalu benar. Aturan bertipe ini
  // menangkap keduanya. Atribut action={aksi} pada form React memang menerima fungsi asinkron. test() dari
  // node:test juga mengembalikan Promise, tetapi pelari uji sudah menunggunya sendiri.
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "@typescript-eslint/no-floating-promises": [
        "error",
        { allowForKnownSafeCalls: [{ from: "package", package: "node:test", name: ["test", "describe", "it", "suite"] }] },
      ],
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      "@typescript-eslint/await-thenable": "error",
    },
  },
  globalIgnores([".next/**", "next-env.d.ts", "data/**"]),
]);
