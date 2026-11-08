// Bundles the API (src/app.ts) into dist/app.js for the Vercel function.
//
// Most packages stay external and load from node_modules at runtime. The few
// below are bundled because they are CommonJS packages that require() ES-only
// modules (sanitize-html → htmlparser2), which Vercel's function runtime does
// not allow. Bundling converts those requires at build time.
import { build } from "esbuild";

const BUNDLED = new Set(["sanitize-html"]);

const packageName = (spec) => (spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);

await build({
  entryPoints: ["src/app.ts"],
  outfile: "dist/app.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  // Bundled CommonJS code may require() Node built-ins; give it a real require.
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  plugins: [
    {
      name: "externals",
      setup(b) {
        b.onResolve({ filter: /^[^./]/ }, (args) => {
          if (args.path.startsWith("node:")) return { external: true };
          // Dependencies of a bundled package are bundled with it.
          if (args.importer.includes("node_modules")) return undefined;
          return BUNDLED.has(packageName(args.path)) ? undefined : { external: true };
        });
      },
    },
  ],
  logLevel: "warning",
});
console.log("Built dist/app.js");
