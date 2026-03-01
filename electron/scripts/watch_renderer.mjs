import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(SCRIPT_DIR, ".."));
const ENTRY_PATH = path.join(ROOT, "renderer", "app.ts");
const OUTFILE_PATH = path.join(ROOT, "dist", "renderer", "app.js");

/**
 * Starts renderer bundler in watch mode for development.
 */
async function watchRenderer() {
    const CONTEXT = await esbuild.context({
        bundle: true,
        entryPoints: [ENTRY_PATH],
        format: "esm",
        outfile: OUTFILE_PATH,
        platform: "browser",
        sourcemap: true,
        target: ["chrome120"],
        tsconfig: path.join(ROOT, "tsconfig.renderer.json"),
    });
    await CONTEXT.watch();
    process.stdout.write("Renderer bundle watch started.\n");
}

watchRenderer().catch((error) => {
    if (error instanceof Error) {
        process.stderr.write(`${error.message}\n`);
    } else {
        process.stderr.write(`${String(error)}\n`);
    }
    process.exit(1);
});
