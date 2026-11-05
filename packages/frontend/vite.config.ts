/** Bundles the renderer entry for browsers alongside the modules emitted by TypeScript. */
import { defineConfig } from "vite-plus";

export default defineConfig({
    build: {
        emptyOutDir: false,
        lib: {
            entry: "src/renderer/app.ts",
            fileName: "app",
            formats: ["es"],
        },
        minify: false,
        outDir: "dist/renderer",
        sourcemap: true,
        target: "chrome120",
    },
    publicDir: false,
});
