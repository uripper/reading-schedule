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
import { logDebug } from "../renderer/logger.js";
import type {
    DownloadCoverPayload,
    JsonValue,
    RegisterIpcHandlersArgs,
    UploadCoverPayload,
} from "../types/types.js";
import { asDownloadCoverPayload, asUploadCoverPayload } from "./ipc_payloads";
import { UI_SCALE_STEP } from "./zoom";

let plannerRequestCounter = 0;

/**
 * Creates a per-request identifier for planner bridge traces.
 * @returns Correlation identifier string.
 */
function nextPlannerRequestId(): string {
    plannerRequestCounter += 1;
    return `planner-${Date.now()}-${plannerRequestCounter}`;
}

/**
 * Registers planner IPC handlers with bridge debug correlation IDs.
 * @param runBridge Bridge runner implementation.
 * @param userData Function returning app user-data directory.
 */
function registerPlannerHandlers(
    runBridge: RegisterIpcHandlersArgs["runBridge"],
    userData: RegisterIpcHandlersArgs["userData"],
): void {
    ipcMain.handle("plan:sample", async () => {
        const REQUEST_ID = nextPlannerRequestId();
        logDebug("IPC received sample planner request.", {
            requestId: REQUEST_ID,
        });
        const RAW_RESPONSE = await runBridge(["--sample"], undefined, {
            requestId: REQUEST_ID,
            userDataDir: userData(),
        });
        return parseSamplePayload(RAW_RESPONSE);
    });

    ipcMain.handle("plan:generate", async (_event, payload: unknown) => {
        const REQUEST_ID = nextPlannerRequestId();
        logDebug("IPC received planner generation request.", {
            requestId: REQUEST_ID,
        });
        const REQUEST = parsePlanGeneratePayload(payload);
        logDebug("Planner request payload parsed.", {
            bookCount: REQUEST.books.length,
            planner: REQUEST.planner,
            requestId: REQUEST_ID,
        });
        const RAW_RESPONSE = await runBridge([], REQUEST, {
            requestId: REQUEST_ID,
            userDataDir: userData(),
        });
        logDebug("Planner bridge returned raw payload.", {
            requestId: REQUEST_ID,
        });
        const RESULT = parsePlanGenerateResult(RAW_RESPONSE);
        const SUMMARY = RESULT.summary;
        let summaryData: Record<string, unknown> | null = null;
        if (SUMMARY && typeof SUMMARY === "object") {
            summaryData = SUMMARY;
        }

        let plannerUsed: string | null = null;
        if (summaryData && typeof summaryData.planner === "string") {
            plannerUsed = summaryData.planner;
        }

        let status: string | null = null;
        if (summaryData && typeof summaryData.status === "string") {
            status = summaryData.status;
        }

        let note: string | null = null;
        if (summaryData && typeof summaryData.note === "string") {
            note = summaryData.note;
        }
        logDebug("Planner result parsed.", {
            note,
            plannerUsed,
            requestId: REQUEST_ID,
            status,
        });
        return RESULT;
    });
}

/**
 * Registers book lookup and cover management handlers.
 * @param downloadCover Cover download implementation.
 * @param saveUploadedCover Cover upload persistence implementation.
 * @param searchBooks Book search implementation.
 * @param userData Function returning app user-data directory.
 */
function registerBookHandlers(
    downloadCover: RegisterIpcHandlersArgs["downloadCover"],
    saveUploadedCover: RegisterIpcHandlersArgs["saveUploadedCover"],
    searchBooks: RegisterIpcHandlersArgs["searchBooks"],
    userData: RegisterIpcHandlersArgs["userData"],
): void {
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
}

/**
 * Registers state load/save handlers.
 * @param readState State read implementation.
 * @param writeState State write implementation.
 * @param userData Function returning app user-data directory.
 */
function registerStateHandlers(
    readState: RegisterIpcHandlersArgs["readState"],
    writeState: RegisterIpcHandlersArgs["writeState"],
    userData: RegisterIpcHandlersArgs["userData"],
): void {
    ipcMain.handle("state:load", () => readState(userData()));
    ipcMain.handle("state:save", (_event, payload: JsonValue) => {
        const RESULT = writeState(userData(), payload);
        if (RESULT.ok === false) {
            throw new Error(RESULT.error);
        }
        return RESULT;
    });
}

/**
 * Registers zoom control handlers.
 * @param initialZoomFactor Initial zoom accessor.
 * @param setZoomFactor Absolute zoom setter.
 * @param shiftZoomFactor Relative zoom setter.
 */
function registerZoomHandlers(
    initialZoomFactor: RegisterIpcHandlersArgs["initialZoomFactor"],
    setZoomFactor: RegisterIpcHandlersArgs["setZoomFactor"],
    shiftZoomFactor: RegisterIpcHandlersArgs["shiftZoomFactor"],
): void {
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
    registerPlannerHandlers(runBridge, userData);
    registerBookHandlers(
        downloadCover,
        saveUploadedCover,
        searchBooks,
        userData,
    );
    registerStateHandlers(readState, writeState, userData);
    registerZoomHandlers(initialZoomFactor, setZoomFactor, shiftZoomFactor);
}
