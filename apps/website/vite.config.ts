import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const WEBSITE_HOST = "127.0.0.1";
const WEBSITE_PORT = 4173;
const WEBSITE_INPUT = {
    index: fileURLToPath(new URL("./index.html", import.meta.url)),
    roadmap: fileURLToPath(new URL("./roadmap.html", import.meta.url)),
};

export default defineConfig({
    base: "./",
    build: {
        emptyOutDir: true,
        outDir: "dist",
        rollupOptions: {
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
