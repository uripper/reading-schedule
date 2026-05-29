/**
 * Tauri-backed planner API adapter for the shared Bartleby frontend.
 */

import type {
    PlanGeneratePayload,
    PlannerApi,
    PlannerApiGlobal,
    PlannerResult,
    PlannerSaveResult,
    PlannerStateLoadResult,
    PlannerStateSnapshot,
} from "@reading-schedule/contracts";
import {
    parsePlanGenerateResult,
    parseSamplePayload,
} from "@reading-schedule/contracts";
import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import type { TauriPlannerCommand } from "./tauri-commands.ts";
import { TAURI_COMMANDS } from "./tauri-commands.ts";
import { createSearchApi } from "./tauri-search-api.ts";

const FILE_PROTOCOL = "file:";
const LOCAL_WINDOWS_PATH_PATTERN = /^[a-zA-Z]:[\\/]/;
const RESOLVED_SOURCE_PREFIXES = [
    "asset:",
    "blob:",
    "data:",
    "http://",
    "https://",
    "tauri:",
];

export interface StateMaintenanceResult {
    changed: boolean;
    coversDeleted: number;
    sqliteJournalRowsDeleted: number;
    stateRepaired: boolean;
}

function filePathFromUrl(src: string): string {
    try {
        const URL_VALUE = new URL(src);
        if (URL_VALUE.protocol !== FILE_PROTOCOL) {
            return "";
        }

        const NORMALIZED_PATH = decodeURIComponent(URL_VALUE.pathname);
        if (URL_VALUE.host.length > 0) {
            return `//${URL_VALUE.host}${NORMALIZED_PATH}`;
        }
        if (
            NORMALIZED_PATH.startsWith("/") &&
            LOCAL_WINDOWS_PATH_PATTERN.test(NORMALIZED_PATH.slice(1))
        ) {
            return NORMALIZED_PATH.slice(1);
        }
        return NORMALIZED_PATH;
    } catch {
        return "";
    }
}

function isFileSystemPath(value: string): boolean {
    if (value.startsWith("/")) {
        return true;
    }
    if (value.startsWith("\\\\")) {
        return true;
    }
    return LOCAL_WINDOWS_PATH_PATTERN.test(value);
}

function isAlreadyResolvedSource(value: string): boolean {
    for (const PREFIX of RESOLVED_SOURCE_PREFIXES) {
        if (value.startsWith(PREFIX)) {
            return true;
        }
    }
    return false;
}

function tauriConvertiblePath(src: string): string {
    const FILE_PATH_FROM_URL = filePathFromUrl(src);
    if (FILE_PATH_FROM_URL.length > 0) {
        return FILE_PATH_FROM_URL;
    }
    if (isFileSystemPath(src)) {
        return src;
    }
    return "";
}

function resolveTauriCoverSrc(src: string | undefined): string {
    const NORMALIZED_SRC = String(src ?? "").trim();
    if (NORMALIZED_SRC.length === 0 || !isTauri()) {
        return NORMALIZED_SRC;
    }
    if (isAlreadyResolvedSource(NORMALIZED_SRC)) {
        return NORMALIZED_SRC;
    }

    const CONVERTIBLE_PATH = tauriConvertiblePath(NORMALIZED_SRC);
    if (CONVERTIBLE_PATH.length > 0) {
        return convertFileSrc(CONVERTIBLE_PATH);
    }
    return NORMALIZED_SRC;
}

async function invokeCommand<T>(
    command: TauriPlannerCommand,
    args?: Record<string, unknown>,
): Promise<T> {
    return await invoke<T>(command, args);
}

function globalPlannerApi(): PlannerApiGlobal {
    return globalThis as PlannerApiGlobal;
}

async function downloadCover(
    url: string | undefined,
    bookId: string | undefined,
): Promise<string> {
    const COVER_PATH = await invokeCommand<string>(
        TAURI_COMMANDS.coverDownload,
        {
            bookId,
            url,
        },
    );
    return resolveTauriCoverSrc(COVER_PATH);
}

function resolveCoverSrc(src: string | undefined): string {
    return resolveTauriCoverSrc(src);
}

async function saveUploadedCover(
    dataUrl: string | undefined,
    bookId: string | undefined,
): Promise<string> {
    const COVER_PATH = await invokeCommand<string>(TAURI_COMMANDS.coverImport, {
        bookId,
        dataUrl,
    });
    return resolveTauriCoverSrc(COVER_PATH);
}

export async function runStateMaintenance(): Promise<StateMaintenanceResult> {
    return await invokeCommand<StateMaintenanceResult>(
        TAURI_COMMANDS.stateRunMaintenance,
    );
}

type AppDataExportResult = Awaited<ReturnType<PlannerApi["exportAppData"]>>;
type AppDataImportResult = Awaited<ReturnType<PlannerApi["importAppData"]>>;

function createDataTransferApi(): Pick<
    PlannerApi,
    "exportAppData" | "importAppData"
> {
    return {
        async exportAppData(): Promise<AppDataExportResult> {
            return await invokeCommand<AppDataExportResult>(
                TAURI_COMMANDS.appDataExport,
            );
        },
        async importAppData(payloadJson: string): Promise<AppDataImportResult> {
            return await invokeCommand<AppDataImportResult>(
                TAURI_COMMANDS.appDataImport,
                {
                    payloadJson,
                },
            );
        },
    };
}

function createCoverApi(): Pick<
    PlannerApi,
    "downloadCover" | "resolveCoverSrc" | "saveUploadedCover"
> {
    return {
        downloadCover,
        resolveCoverSrc,
        saveUploadedCover,
    };
}

function createPlanApi(): Pick<PlannerApi, "generate" | "sample"> {
    return {
        async generate(
            payload: PlanGeneratePayload,
        ): Promise<Pick<PlannerResult, "schedule" | "summary">> {
            const RESULT = await invokeCommand<unknown>(
                TAURI_COMMANDS.planGenerate,
                {
                    payload,
                },
            );
            return parsePlanGenerateResult(RESULT);
        },
        async sample(): Promise<
            Pick<PlannerStateSnapshot, "books" | "settings">
        > {
            const RESULT = await invokeCommand<unknown>(
                TAURI_COMMANDS.planSample,
            );
            return parseSamplePayload(RESULT);
        },
    };
}

function createStateApi(): Pick<PlannerApi, "loadState" | "saveState"> {
    return {
        async loadState(): Promise<PlannerStateLoadResult> {
            return await invokeCommand<PlannerStateLoadResult>(
                TAURI_COMMANDS.stateLoad,
            );
        },
        async saveState(
            state: PlannerStateSnapshot,
        ): Promise<PlannerSaveResult> {
            return await invokeCommand<PlannerSaveResult>(
                TAURI_COMMANDS.stateSave,
                {
                    state,
                },
            );
        },
    };
}

function createZoomApi(): Pick<PlannerApi, "zoomIn" | "zoomOut" | "zoomReset"> {
    return {
        async zoomIn(): Promise<number> {
            return await invokeCommand<number>(TAURI_COMMANDS.windowZoomIn);
        },
        async zoomOut(): Promise<number> {
            return await invokeCommand<number>(TAURI_COMMANDS.windowZoomOut);
        },
        async zoomReset(): Promise<number> {
            return await invokeCommand<number>(TAURI_COMMANDS.windowZoomReset);
        },
    };
}

function createTauriPlannerApi(): PlannerApi {
    return {
        ...createDataTransferApi(),
        ...createCoverApi(),
        ...createPlanApi(),
        ...createSearchApi(invokeCommand),
        ...createStateApi(),
        ...createZoomApi(),
    };
}

export function installTauriPlannerApi(): PlannerApi {
    const API = createTauriPlannerApi();
    globalPlannerApi().plannerApi = API;
    return API;
}
