import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(SCRIPT_DIR, ".."));
const FRONTEND_ROOT = path.resolve(ROOT, "..", "packages", "frontend");
const ENTRY_PATH = path.join(FRONTEND_ROOT, "src", "renderer", "app.ts");
const OUTFILE_PATH = path.join(ROOT, "dist", "renderer", "app.js");

/**
 * Bundles renderer entrypoint so browser runtime never resolves bare npm specifiers.
 */
async function bundleRenderer() {
    await build({
        bundle: true,
        entryPoints: [ENTRY_PATH],
        format: "esm",
        outfile: OUTFILE_PATH,
        platform: "browser",
        sourcemap: true,
        target: ["chrome120"],
        tsconfig: path.join(FRONTEND_ROOT, "tsconfig.json"),
    });
}

bundleRenderer().catch((error) => {
    if (error instanceof Error) {
        process.stderr.write(`${error.message}\n`);
    } else {
        process.stderr.write(`${String(error)}\n`);
    }
    process.exit(1);
});
