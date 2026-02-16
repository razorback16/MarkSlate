import { build } from "esbuild";

await build({
  entryPoints: ["ai-sidecar.mjs"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  outfile: "dist/ai-sidecar.mjs",
  banner: { js: "#!/usr/bin/env node" },
});

console.log("Built dist/ai-sidecar.mjs");
