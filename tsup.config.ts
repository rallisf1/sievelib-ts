import { defineConfig } from "tsup";
export default defineConfig({ entry: ["src/index.ts", "src/commands.ts", "src/parser.ts", "src/factory.ts", "src/managesieve.ts", "src/tools.ts"], format: ["esm", "cjs"], dts: true, clean: true, splitting: false, sourcemap: true, target: "node20" });
