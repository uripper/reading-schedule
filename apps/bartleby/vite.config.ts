import { defineConfig } from "vite";

interface ProcessLike {
    env?: Record<string, string | undefined>;
}

function tauriDevHost(): string | undefined {
    const PROCESS_LIKE = globalThis as typeof globalThis & {
        process?: ProcessLike;
    };
    return PROCESS_LIKE.process?.env?.TAURI_DEV_HOST;
}

function hmrConfig(host: string | undefined) {
    if (!host) {
        return undefined;
    }
    return {
        host,
        port: 1421,
        protocol: "ws",
    };
}

const TAURI_DEV_HOST = tauriDevHost();

// https://vite.dev/config/
// biome-ignore lint/style/noDefaultExport: Vite loads config files from the default export.
export default defineConfig(async () => ({
    base: "./",

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    publicDir: "../../packages/frontend/public",
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        fs: {
            allow: ["../.."],
        },
        hmr: hmrConfig(TAURI_DEV_HOST),
        host: TAURI_DEV_HOST,
        port: 1420,
        strictPort: true,
        watch: {
            // 3. tell Vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
}));
