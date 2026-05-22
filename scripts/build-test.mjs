import * as esbuild from "esbuild";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
mkdirSync(join(root, "dist-test"), { recursive: true });

const entries = ["format", "storage", "migrate", "keep-settings"].map((name) => ({
  in: join(root, `src/shared/${name}.ts`),
  out: join(root, `dist-test/${name}.js`),
}));

for (const { in: entry, out: outfile } of entries) {
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
  });
}

console.log("Test bundles ready.");
