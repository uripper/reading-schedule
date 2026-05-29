import type { PlannerApi, PlannerStateLoadResult } from "../types/types.ts";
import { readLoadedResult, toSavedRecord } from "./app/load_state_compat.ts";

type HelpImportApi = Pick<PlannerApi, "importAppData" | "loadState">;
type AppDataImportResult = Awaited<ReturnType<HelpImportApi["importAppData"]>>;
type ImportCountKey =
    | "booksRestored"
    | "completionEntriesRestored"
    | "scheduleRowsRestored"
    | "sessionsRestored";
type ImportCounts = Pick<AppDataImportResult, ImportCountKey>;

const EMPTY_IMPORT_COUNTS: ImportCounts = {
    booksRestored: 0,
    completionEntriesRestored: 0,
    scheduleRowsRestored: 0,
    sessionsRestored: 0,
};

export function importResultSummary(result: AppDataImportResult): string {
    return [
        "Verified app data import",
        importCountsSummary(result),
        `${result.filesRestored} files`,
    ].join(", ");
}

export function importHasVisiblePlannerData(
    result: AppDataImportResult,
): boolean {
    if (result.booksRestored > 0) {
        return true;
    }
    if (result.scheduleRowsRestored > 0) {
        return true;
    }
    return result.sessionsRestored > 0;
}

export function importLoadSourceSummary(
    loadResult: PlannerStateLoadResult,
): string {
    if (
        typeof loadResult.sourcePath === "string" &&
        loadResult.sourcePath.length > 0
    ) {
        return `Post-import load source: ${loadResult.source} (${loadResult.sourcePath})`;
    }
    return `Post-import load source: ${loadResult.source}`;
}

export function importVerificationError(
    imported: AppDataImportResult,
    loadResult: PlannerStateLoadResult,
): string {
    const LOADED_COUNTS = loadedImportCounts(loadResult);
    if (importCountsMatch(imported, LOADED_COUNTS)) {
        return "";
    }
    return [
        "Post-import verification failed.",
        `Native import restored ${importCountsSummary(imported)}.`,
        `Immediate load returned ${importCountsSummary(LOADED_COUNTS)}.`,
        "Not refreshing.",
    ].join(" ");
}

function loadedImportCounts(loadResult: PlannerStateLoadResult): ImportCounts {
    const STATE = loadResult.state;
    if (!STATE) {
        return EMPTY_IMPORT_COUNTS;
    }
    const LOADED_RESULT = readLoadedResult(STATE, toSavedRecord(STATE));
    return {
        booksRestored: STATE.books?.length ?? 0,
        completionEntriesRestored: Object.keys(STATE.schedule_completions ?? {})
            .length,
        scheduleRowsRestored: LOADED_RESULT?.schedule.length ?? 0,
        sessionsRestored: STATE.sessions?.length ?? 0,
    };
}

function importCountsMatch(
    imported: ImportCounts,
    loaded: ImportCounts,
): boolean {
    if (imported.booksRestored !== loaded.booksRestored) {
        return false;
    }
    if (imported.scheduleRowsRestored !== loaded.scheduleRowsRestored) {
        return false;
    }
    if (imported.sessionsRestored !== loaded.sessionsRestored) {
        return false;
    }
    return (
        imported.completionEntriesRestored === loaded.completionEntriesRestored
    );
}

function importCountsSummary(counts: ImportCounts): string {
    return [
        `${counts.booksRestored} books`,
        `${counts.scheduleRowsRestored} schedule rows`,
        `${counts.sessionsRestored} sessions`,
        `${counts.completionEntriesRestored} completion entries`,
    ].join(", ");
}
