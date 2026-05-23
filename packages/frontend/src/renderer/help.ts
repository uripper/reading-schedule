import type { PlannerApi, PlannerApiGlobal } from "../types/types.ts";
import { bindDialogFocus } from "./accessibility/a11y.ts";
import { errorMessage } from "./app/plan-errors.ts";
import { el } from "./dom.ts";
import {
    importHasVisiblePlannerData,
    importLoadSourceSummary,
    importResultSummary,
    importVerificationError,
} from "./help-import.ts";

const LOGS: string[] = [];
const MAX_LOG_LINES = 250;

type HelpDataActionsApi = Pick<
    PlannerApi,
    "exportAppData" | "importAppData" | "loadState"
>;
type AppDataImportResult = Awaited<
    ReturnType<HelpDataActionsApi["importAppData"]>
>;

interface HelpDataActionRefs {
    actions: HTMLElement;
    exportButton: HTMLButtonElement;
    importButton: HTMLButtonElement;
    importInput: HTMLInputElement;
}

interface HelpDialogOptions {
    beforeImport?(): Promise<void>;
}

interface SaveFilePickerAcceptType {
    accept: Record<string, string[]>;
    description?: string;
}

interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: SaveFilePickerAcceptType[];
}

interface SaveFilePickerWriter {
    close(): Promise<void>;
    write(data: string): Promise<void>;
}

interface SaveFilePickerHandle {
    createWritable(): Promise<SaveFilePickerWriter>;
}

type SavePickerFunction = (
    options?: SaveFilePickerOptions,
) => Promise<SaveFilePickerHandle>;
type ExportSaveResult = "saved" | "downloaded" | "canceled";

function ts(): string {
    return new Date().toLocaleTimeString();
}

function canRenderLogs(): boolean {
    return typeof document !== "undefined";
}

function renderLogs(): void {
    if (!canRenderLogs()) {
        return;
    }
    const LOG_OUTPUT = document.getElementById("logOutput");
    if (!(LOG_OUTPUT instanceof HTMLElement)) {
        return;
    }
    LOG_OUTPUT.textContent = LOGS.join("\n") || "No logs yet.";
}

export function addLog(message: string): void {
    LOGS.unshift(`[${ts()}] ${message}`);
    if (LOGS.length > MAX_LOG_LINES) {
        LOGS.pop();
    }
    renderLogs();
}

function dataActionsApi(): HelpDataActionsApi | null {
    const { plannerApi: PLANNER_API } = globalThis as PlannerApiGlobal;
    if (!PLANNER_API) {
        return null;
    }
    return PLANNER_API;
}

function dataActionRefs(): HelpDataActionRefs {
    return {
        actions: el<HTMLElement>("helpDialogDataActions"),
        exportButton: el<HTMLButtonElement>("helpExportDataBtn"),
        importButton: el<HTMLButtonElement>("helpImportDataBtn"),
        importInput: el<HTMLInputElement>("helpImportDataInput"),
    };
}

function setDataActionsBusy(refs: HelpDataActionRefs, busy: boolean): void {
    const { exportButton: EXPORT_BUTTON, importButton: IMPORT_BUTTON } = refs;
    EXPORT_BUTTON.disabled = busy;
    IMPORT_BUTTON.disabled = busy;
}

function hideDataActions(refs: HelpDataActionRefs): void {
    const { actions: ACTIONS, importInput: IMPORT_INPUT } = refs;
    ACTIONS.hidden = true;
    IMPORT_INPUT.value = "";
}

function dataActionErrorMessage(error: unknown): string {
    return errorMessage(error);
}

function savePicker(): SavePickerFunction | null {
    const GLOBAL = globalThis as typeof globalThis & {
        showSaveFilePicker?: SavePickerFunction;
    };
    if (typeof GLOBAL.showSaveFilePicker !== "function") {
        return null;
    }
    return GLOBAL.showSaveFilePicker;
}

function pickerCanceled(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

function downloadArchive(fileName: string, payloadJson: string): void {
    const BLOB = new Blob([payloadJson], {
        type: "application/json",
    });
    const OBJECT_URL = URL.createObjectURL(BLOB);
    const LINK = document.createElement("a");
    LINK.download = fileName;
    LINK.href = OBJECT_URL;
    LINK.hidden = true;
    document.body.append(LINK);
    LINK.click();
    globalThis.setTimeout(() => {
        URL.revokeObjectURL(OBJECT_URL);
        LINK.remove();
    }, 0);
}

async function saveArchive(
    fileName: string,
    payloadJson: string,
): Promise<ExportSaveResult> {
    const SAVE_PICKER = savePicker();
    if (SAVE_PICKER === null) {
        downloadArchive(fileName, payloadJson);
        return "downloaded";
    }
    try {
        const HANDLE = await SAVE_PICKER({
            suggestedName: fileName,
            types: [
                {
                    accept: {
                        "application/json": [".json"],
                    },
                    description: "Bartleby backups",
                },
            ],
        });
        const WRITER = await HANDLE.createWritable();
        await WRITER.write(payloadJson);
        await WRITER.close();
        return "saved";
    } catch (error) {
        if (pickerCanceled(error)) {
            return "canceled";
        }
        throw error;
    }
}

async function exportAppDataBackup(
    api: HelpDataActionsApi,
    refs: HelpDataActionRefs,
): Promise<void> {
    setDataActionsBusy(refs, true);
    try {
        const EXPORT_RESULT = await api.exportAppData();
        const SAVE_RESULT = await saveArchive(
            EXPORT_RESULT.fileName,
            EXPORT_RESULT.payloadJson,
        );
        if (SAVE_RESULT === "canceled") {
            return;
        }
        if (SAVE_RESULT === "downloaded") {
            addLog("Exported app data backup using the download fallback.");
            return;
        }
        addLog("Exported app data backup.");
    } catch (error) {
        addLog(`Failed to export app data: ${dataActionErrorMessage(error)}`);
    } finally {
        setDataActionsBusy(refs, false);
    }
}

async function shouldReloadAfterImport(
    api: HelpDataActionsApi,
    importResult: AppDataImportResult,
): Promise<boolean> {
    addLog(importResultSummary(importResult));
    const LOAD_RESULT = await api.loadState();
    addLog(importLoadSourceSummary(LOAD_RESULT));
    const VERIFY_ERROR = importVerificationError(importResult, LOAD_RESULT);
    if (VERIFY_ERROR.length > 0) {
        addLog(VERIFY_ERROR);
        return false;
    }
    if (importHasVisiblePlannerData(importResult)) {
        return true;
    }
    addLog("Import verified, but no books or schedule data were restored.");
    return false;
}

async function importSelectedAppData(
    api: HelpDataActionsApi,
    refs: HelpDataActionRefs,
    options: HelpDialogOptions,
): Promise<void> {
    const { importInput: IMPORT_INPUT } = refs;
    const FILE = IMPORT_INPUT.files?.item(0);
    IMPORT_INPUT.value = "";
    if (!FILE) {
        return;
    }
    setDataActionsBusy(refs, true);
    try {
        await options.beforeImport?.();
        const PAYLOAD_JSON = await FILE.text();
        const IMPORT_RESULT = await api.importAppData(PAYLOAD_JSON);
        const SHOULD_RELOAD = await shouldReloadAfterImport(api, IMPORT_RESULT);
        if (!SHOULD_RELOAD) {
            setDataActionsBusy(refs, false);
            return;
        }
        globalThis.location.reload();
    } catch (error) {
        addLog(`Failed to import app data: ${dataActionErrorMessage(error)}`);
        setDataActionsBusy(refs, false);
    }
}

function bindHelpDataActions(options: HelpDialogOptions): void {
    const REFS = dataActionRefs();
    const API = dataActionsApi();
    if (!API) {
        hideDataActions(REFS);
        return;
    }
    REFS.exportButton.onclick = async (): Promise<void> => {
        await exportAppDataBackup(API, REFS);
    };
    REFS.importButton.onclick = (): void => {
        REFS.importInput.click();
    };
    REFS.importInput.onchange = async (event): Promise<void> => {
        event.stopPropagation();
        await importSelectedAppData(API, REFS, options);
    };
}

/**
 * Binds help dialog open/close controls with focus restoration behavior.
 */
export function bindHelpDialog(options: HelpDialogOptions = {}): void {
    const DLG = el<HTMLDialogElement>("helpDialog");
    const FOCUS = bindDialogFocus(DLG, {
        initialFocusSelector: "#closeHelpBtn",
    });
    bindHelpDataActions(options);
    el<HTMLButtonElement>("helpBtn").onclick = () => {
        FOCUS.rememberOpener();
        DLG.showModal();
        FOCUS.focusInitialTarget();
    };
    el<HTMLButtonElement>("closeHelpBtn").onclick = (): void => {
        FOCUS.closeAndReturnFocus();
    };
    DLG.addEventListener("cancel", (e) => {
        e.preventDefault();
        FOCUS.closeAndReturnFocus();
    });
    renderLogs();
}
