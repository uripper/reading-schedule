import type {
    DownloadCoverPayload,
    JsonValue,
    RegisterIpcHandlersArgs,
    UploadCoverPayload,
} from "@reading-schedule/contracts";
import {
    parsePlanGeneratePayload,
    parsePlanGenerateResult,
    parseSamplePayload,
} from "@reading-schedule/contracts";
import { ipcMain } from "electron";
import { logDebug } from "../types/logger.ts";
import {
    asDownloadCoverPayload,
    asUploadCoverPayload,
} from "./ipc_payloads.ts";
import { UI_SCALE_STEP } from "./zoom.ts";

let plannerRequestCounter = 0;

// TODO: Move interfaces and types to contracts 

interface PlannerRequestContext {
    requestId: string;
    userDataDir: string;
}

interface PlannerSummaryLogFields {
    note: string | null;
    plannerUsed: string | null;
    status: string | null;
}

type PlannerSummaryField = "note" | "planner" | "status";
type PlannerSummaryRecord = Partial<Record<PlannerSummaryField, unknown>>;

interface BookHandlerArgs {
    downloadCover: RegisterIpcHandlersArgs["downloadCover"];
    saveUploadedCover: RegisterIpcHandlersArgs["saveUploadedCover"];
    searchBooks: RegisterIpcHandlersArgs["searchBooks"];
    userData: RegisterIpcHandlersArgs["userData"];
}

/**
 * Creates a per-request identifier for planner bridge traces.
 * @returns Correlation identifier string.
 */
function nextPlannerRequestId(): string {
    plannerRequestCounter += 1;
    return `planner-${Date.now()}-${plannerRequestCounter}`;
}

function plannerRequestContext(
    userData: RegisterIpcHandlersArgs["userData"],
): PlannerRequestContext {
    return {
        requestId: nextPlannerRequestId(),
        userDataDir: userData(),
    };
}

function stringSummaryField(
    summary: unknown,
    field: PlannerSummaryField,
): string | null {
    if (summary === null || typeof summary !== "object") {
        return null;
    }
    const SUMMARY_RECORD = summary as PlannerSummaryRecord;
    const VALUE = SUMMARY_RECORD[field];
    if (typeof VALUE !== "string") {
        return null;
    }
    return VALUE;
}

function plannerSummaryLogFields(
    result: ReturnType<typeof parsePlanGenerateResult>,
): PlannerSummaryLogFields {
    return {
        note: stringSummaryField(result.summary, "note"),
        plannerUsed: stringSummaryField(result.summary, "planner"),
        status: stringSummaryField(result.summary, "status"),
    };
}

async function handleSamplePlannerRequest(
    runBridge: RegisterIpcHandlersArgs["runBridge"],
    userData: RegisterIpcHandlersArgs["userData"],
): Promise<ReturnType<typeof parseSamplePayload>> {
    const CONTEXT = plannerRequestContext(userData);
    logDebug("IPC received sample planner request.", {
        requestId: CONTEXT.requestId,
    });
    const RAW_RESPONSE = await runBridge(["--sample"], undefined, CONTEXT);
    return parseSamplePayload(RAW_RESPONSE);
}

function parsePlannerGenerationRequest(
    payload: unknown,
    requestId: string,
): ReturnType<typeof parsePlanGeneratePayload> {
    const REQUEST = parsePlanGeneratePayload(payload);
    logDebug("Planner request payload parsed.", {
        bookCount: REQUEST.books.length,
        planner: REQUEST.planner,
        requestId,
    });
    return REQUEST;
}

function parsePlannerGenerationResponse(
    rawResponse: unknown,
    requestId: string,
): ReturnType<typeof parsePlanGenerateResult> {
    logDebug("Planner bridge returned raw payload.", { requestId });
    const RESULT = parsePlanGenerateResult(rawResponse);
    logDebug("Planner result parsed.", {
        ...plannerSummaryLogFields(RESULT),
        requestId,
    });
    return RESULT;
}

async function handleGeneratePlannerRequest(
    payload: unknown,
    runBridge: RegisterIpcHandlersArgs["runBridge"],
    userData: RegisterIpcHandlersArgs["userData"],
): Promise<ReturnType<typeof parsePlanGenerateResult>> {
    const CONTEXT = plannerRequestContext(userData);
    const REQUEST_ID = CONTEXT.requestId;
    logDebug("IPC received planner generation request.", {
        requestId: REQUEST_ID,
    });
    const REQUEST = parsePlannerGenerationRequest(payload, REQUEST_ID);
    const RAW_RESPONSE = await runBridge([], REQUEST, CONTEXT);
    return parsePlannerGenerationResponse(RAW_RESPONSE, REQUEST_ID);
}

function registerBookSearchHandler({
    searchBooks,
}: Pick<BookHandlerArgs, "searchBooks">): void {
    ipcMain.handle(
        "book:search",
        async (_event, query: string, author: unknown) =>
            await searchBooks(String(query || ""), author === true),
    );
}

function registerBookDownloadCoverHandler({
    downloadCover,
    userData,
}: Pick<BookHandlerArgs, "downloadCover" | "userData">): void {
    ipcMain.handle(
        "book:downloadCover",
        async (_event, payload: DownloadCoverPayload | null) => {
            const REQUEST = asDownloadCoverPayload(payload);
            return await downloadCover(REQUEST.url, REQUEST.bookId, userData());
        },
    );
}

function registerUploadedCoverHandler({
    saveUploadedCover,
    userData,
}: Pick<BookHandlerArgs, "saveUploadedCover" | "userData">): void {
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
 * Registers planner IPC handlers with bridge debug correlation IDs.
 * @param runBridge - Bridge runner implementation.
 * @param userData - Function returning app user-data directory.
 */
function registerPlannerHandlers(
    runBridge: RegisterIpcHandlersArgs["runBridge"],
    userData: RegisterIpcHandlersArgs["userData"],
): void {
    ipcMain.handle(
        "plan:sample",
        async () => await handleSamplePlannerRequest(runBridge, userData),
    );
    ipcMain.handle(
        "plan:generate",
        async (_event, payload: unknown) =>
            await handleGeneratePlannerRequest(payload, runBridge, userData),
    );
}

/**
 * Registers book lookup and cover management handlers.
 * @param downloadCover - Cover download implementation.
 * @param saveUploadedCover - Cover upload persistence implementation.
 * @param searchBooks - Book search implementation.
 * @param userData - Function returning app user-data directory.
 */
function registerBookHandlers(args: BookHandlerArgs): void {
    registerBookSearchHandler(args);
    registerBookDownloadCoverHandler(args);
    registerUploadedCoverHandler(args);
}

/**
 * Registers state load/save handlers.
 * @param readState - State read implementation.
 * @param writeState - State write implementation.
 * @param userData - Function returning app user-data directory.
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
 * @param initialZoomFactor - Initial zoom accessor.
 * @param setZoomFactor - Absolute zoom setter.
 * @param shiftZoomFactor - Relative zoom setter.
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
 * @param root0 - IPC dependency implementations.
 * @param downloadCover - Fetches and stores a remote cover image.
 * @param initialZoomFactor - Returns the configured initial zoom factor.
 * @param readState - Loads persisted renderer state from disk.
 * @param runBridge - Invokes the planner bridge command.
 * @param saveUploadedCover - Persists a user-uploaded cover image.
 * @param searchBooks - Executes remote book search by query.
 * @param setZoomFactor - Applies an absolute zoom factor.
 * @param shiftZoomFactor - Applies a relative zoom factor delta.
 * @param userData - Returns the app user-data directory path.
 * @param writeState - Persists renderer state payload to disk.
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
    registerBookHandlers({
        downloadCover,
        saveUploadedCover,
        searchBooks,
        userData,
    });
    registerStateHandlers(readState, writeState, userData);
    registerZoomHandlers(initialZoomFactor, setZoomFactor, shiftZoomFactor);
}
