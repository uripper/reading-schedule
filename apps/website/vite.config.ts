/** Builds and serves the public site and browser demo. */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const WEBSITE_HOST = "127.0.0.1";
const WEBSITE_PORT = 4173;
const WEBSITE_INPUT = {
    demo: fileURLToPath(new URL("./demo.html", import.meta.url)),
    index: fileURLToPath(new URL("./index.html", import.meta.url)),
    performance: fileURLToPath(new URL("./performance.html", import.meta.url)),
    roadmap: fileURLToPath(new URL("./roadmap.html", import.meta.url)),
};

export default defineConfig({
    base: "./",
    build: {
        emptyOutDir: true,
        outDir: "dist",
        rolldownOptions: {
            input: WEBSITE_INPUT,
        },
    },
    preview: {
        host: WEBSITE_HOST,
        port: WEBSITE_PORT,
        strictPort: true,
    },
    server: {
        host: WEBSITE_HOST,
        port: WEBSITE_PORT,
        strictPort: true,
    },
});
