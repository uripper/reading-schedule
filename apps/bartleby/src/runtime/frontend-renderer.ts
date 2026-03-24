/**
 * Loads the built shared frontend renderer into the Tauri shell.
 */
let frontendRendererStartPromise: Promise<void> | undefined;

async function importFrontendRenderer(): Promise<void> {
    const FRONTEND_RENDERER_URL = new URL(
        "../../../../packages/frontend/dist/renderer/app.js",
        import.meta.url,
    );
    await import(/* @vite-ignore */ FRONTEND_RENDERER_URL.href);
}

export function startFrontendRenderer(): Promise<void> {
    frontendRendererStartPromise ??= importFrontendRenderer();
    return frontendRendererStartPromise;
}
