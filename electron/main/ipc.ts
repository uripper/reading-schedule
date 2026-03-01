/**
 * @file Main-process IPC registration for planner and window actions.
 */
import { ipcMain } from "electron";
import {
    parsePlanGeneratePayload,
    parsePlanGenerateResult,
    parseSamplePayload,
} from "../contracts/planner.js";
import { parsePlannerStateSnapshot } from "../contracts/state.js";
import type {
    DownloadCoverPayload,
    JsonValue,
    RegisterIpcHandlersArgs,
    UploadCoverPayload,
} from "../types/types.js";
import { asDownloadCoverPayload, asUploadCoverPayload } from "./ipc_payloads";
import { UI_SCALE_STEP } from "./zoom";

/**
 * Registers all main-process IPC handlers consumed by the renderer.
 * @param root0 IPC dependency implementations.
 * @param root0.downloadCover Fetches and stores a remote cover image.
 * @param root0.initialZoomFactor Returns the configured initial zoom factor.
 * @param root0.readState Loads persisted renderer state from disk.
 * @param root0.runBridge Invokes the planner bridge command.
 * @param root0.saveUploadedCover Persists a user-uploaded cover image.
 * @param root0.searchBooks Executes remote book search by query.
 * @param root0.setZoomFactor Applies an absolute zoom factor.
 * @param root0.shiftZoomFactor Applies a relative zoom factor delta.
 * @param root0.userData Returns the app user-data directory path.
 * @param root0.writeState Persists renderer state payload to disk.
 */
export function registerIpcHandlers({
    downloadCover,
    initialZoomFactor,
    readState,
    runBridge,
    saveUploadedCover,
    searchBooks,
    setZoomFactor,
    shiftZoomFactor,
    userData,
    writeState,
}: RegisterIpcHandlersArgs): void {
    ipcMain.handle("plan:sample", async () => {
        const RAW_RESPONSE = await runBridge(["--sample"]);
        return parseSamplePayload(RAW_RESPONSE);
    });
    ipcMain.handle("plan:generate", async (_event, payload: unknown) => {
        const REQUEST = parsePlanGeneratePayload(payload);
        const RAW_RESPONSE = await runBridge(
            [],
            REQUEST as unknown as JsonValue,
        );
        return parsePlanGenerateResult(RAW_RESPONSE);
    });
    ipcMain.handle(
        "book:search",
        async (_event, query: string, author: unknown) =>
            await searchBooks(String(query || ""), author === true),
    );
    ipcMain.handle(
        "book:downloadCover",
        async (_event, payload: DownloadCoverPayload | null) => {
            const REQUEST = asDownloadCoverPayload(payload);
            return await downloadCover(REQUEST.url, REQUEST.bookId, userData());
        },
    );
    ipcMain.handle(
        "book:saveUploadedCover",
        (_event, payload: UploadCoverPayload | null) => {
            const REQUEST = asUploadCoverPayload(payload);
            return saveUploadedCover(
                REQUEST.dataUrl,
                REQUEST.bookId,
                userData(),
            );
        },
    );
    ipcMain.handle("state:load", () => readState(userData()));
    ipcMain.handle("state:save", (_event, payload: unknown) => {
        const SNAPSHOT = parsePlannerStateSnapshot(payload);
        const RESULT = writeState(userData(), SNAPSHOT as unknown as JsonValue);
        if (RESULT.ok === false) {
            throw new Error(RESULT.error);
        }
        return RESULT;
    });
    ipcMain.handle("window:zoomIn", (event) =>
        shiftZoomFactor(event.sender, UI_SCALE_STEP),
    );
    ipcMain.handle("window:zoomOut", (event) =>
        shiftZoomFactor(event.sender, -UI_SCALE_STEP),
    );
    ipcMain.handle("window:zoomReset", (event) =>
        setZoomFactor(event.sender, initialZoomFactor()),
    );
}
