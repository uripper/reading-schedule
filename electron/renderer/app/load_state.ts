import type {
    FeatureFlags,
    InitialDataSource,
    LoadedPlannerState,
    LoadStateArgs,
    PlannerApi,
    PlannerStateLoadResult,
    Preferences,
} from "../../types/types.js";
import { normalizeSessions } from "../sessions/normalize.js";
import {
    readFeatureFlags,
    readLoadedResult,
    readRawCompletions,
    readRawSessions,
    sessionInputs,
    toSavedRecord,
} from "./load_state_compat.js";

/**
 * Normalizes persisted blocked day-book map values to strict booleans.
 * @param raw Persisted blocked map keyed by `YYYY-MM-DD|book_id`.
 * @returns Sanitized blocked map.
 */
function normalizeBlockedDayBooks(
    raw: Record<string, string | number | boolean | null | undefined> = {},
): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    Object.entries(raw).forEach(([key, value]) => {
        if (!key) {
            return;
        }
        out[key] = Boolean(value);
    });
    return out;
}

/**
 * Checks whether loaded state already contains full bootstrapping data.
 * @param source Saved planner state returned from persistence.
 * @returns True when settings and books are both present.
 */
function hasInitialSettingsAndBooks(
    source: LoadedPlannerState | null | undefined,
): source is InitialDataSource {
    if (source === null || source === undefined) {
        return false;
    }
    if (source.settings === undefined) {
        return false;
    }
    if (source.books === undefined) {
        return false;
    }
    return true;
}

/**
 * Resolves initial boot source from saved state or sample fallback.
 * @param plannerApi Planner API with sample data support.
 * @param saved Loaded state from persistence.
 * @returns Settings and books used to initialize the UI.
 */
async function resolveInitialSource(
    plannerApi: Pick<PlannerApi, "sample">,
    saved: LoadedPlannerState | null | undefined,
): Promise<InitialDataSource> {
    if (hasInitialSettingsAndBooks(saved)) {
        return saved;
    }
    return await plannerApi.sample();
}

/**
 * Logs the persistence source path used for this load operation.
 * @param loadResult Structured load result metadata.
 * @param addLog Optional log sink for user-visible diagnostics.
 */
function appendLoadSourceLog(
    loadResult: PlannerStateLoadResult,
    addLog: LoadStateArgs["addLog"] | undefined,
): void {
    if (typeof addLog !== "function") {
        return;
    }
    let sourceMessage: string = loadResult.source;
    if (
        typeof loadResult.sourcePath === "string" &&
        loadResult.sourcePath.length > 0
    ) {
        sourceMessage = `${sourceMessage} (${loadResult.sourcePath})`;
    }
    addLog(`State load source: ${sourceMessage}`);
}

/**
 * Publishes recovery status messages for backup/journal/fresh reset loads.
 * @param loadResult Structured load result metadata.
 * @param setStatus Status sink for user-visible warnings.
 */
function reportRecoveryStatus(
    loadResult: PlannerStateLoadResult,
    setStatus: LoadStateArgs["setStatus"],
): void {
    if (loadResult.source === "json_backup") {
        setStatus(
            "Recovered saved data from backup copy. Recent unsaved changes may be missing.",
            true,
        );
        return;
    }
    if (loadResult.source === "sqlite_journal_replay") {
        setStatus(
            "Recovered saved data from journal replay after storage corruption.",
            true,
        );
        return;
    }
    if (
        loadResult.source === "fresh" &&
        loadResult.warningCode === "STATE_RESET_FRESH"
    ) {
        setStatus("Saved state was unreadable. Started with fresh data.", true);
    }
}

/**
 * Indicates whether current load used the JSON migration path.
 * @param loadResult Structured load result metadata.
 * @returns True when migration info should be logged.
 */
function didMigrateFromJson(loadResult: PlannerStateLoadResult): boolean {
    if (loadResult.warningCode === "MIGRATED_JSON_TO_SQLITE") {
        return true;
    }
    if (loadResult.source === "json_primary") {
        return true;
    }
    if (loadResult.source === "json_backup") {
        return true;
    }
    return false;
}

/**
 * Emits recovery status/log output based on persistence load source metadata.
 * @param loadResult Structured load result from persistence facade.
 * @param args Runtime wiring for status/log output.
 */
function reportLoadRecovery(
    loadResult: PlannerStateLoadResult,
    args: Pick<LoadStateArgs, "setStatus" | "addLog">,
): void {
    appendLoadSourceLog(loadResult, args.addLog);
    reportRecoveryStatus(loadResult, args.setStatus);
    if (didMigrateFromJson(loadResult) && typeof args.addLog === "function") {
        args.addLog("Migrated saved data from JSON storage to SQLite.");
    }
}

/**
 * Applies settings, books, and completion maps to runtime state.
 * @param saved Loaded state from persistence.
 * @param source Initial source containing settings and books.
 * @param args Runtime wiring for state setters and normalizers.
 */
function applyLoadedData(
    saved: LoadedPlannerState | null | undefined,
    source: InitialDataSource,
    args: LoadStateArgs,
): void {
    const savedRecord = toSavedRecord(saved);
    args.fillSettings(source.settings);
    args.fillBooks(source.books);
    args.setScheduleCompletions(
        args.normalizeScheduleCompletions(
            readRawCompletions(saved, savedRecord),
        ),
    );
    args.setBlockedDayBooks(
        normalizeBlockedDayBooks(
            saved?.blocked_day_books as
                | Record<string, string | number | boolean | null | undefined>
                | undefined,
        ),
    );
}

/**
 * Applies sessions and last result, then refreshes Today view state.
 * @param saved Loaded state from persistence.
 * @param args Runtime wiring for session/result setters.
 */
function applySessionAndResultData(
    saved: LoadedPlannerState | null | undefined,
    args: LoadStateArgs,
): void {
    const savedRecord = toSavedRecord(saved);
    const sessions = normalizeSessions(
        sessionInputs(readRawSessions(saved, savedRecord)),
    );
    const loadedResult = readLoadedResult(saved, savedRecord);
    args.setSessions(sessions);
    args.applyLoadedResult(loadedResult);
    args.updateTodayView();
}

/**
 * Applies normalized preference data to UI controls and document styles.
 * @param args Runtime wiring for preference/feature UI application.
 * @param preferences Normalized user preferences.
 * @param featureFlags Normalized feature flags.
 */
function applyExperienceData(
    args: LoadStateArgs,
    preferences: Preferences,
    featureFlags: FeatureFlags,
): void {
    args.fillPreferencesUI(preferences, featureFlags);
    args.applyPreferencesToDocument(preferences);
}

/**
 * Loads persisted planner state and applies it to the running UI/runtime state.
 * @param args Runtime dependencies for loading, normalizing, and applying state.
 * @returns Promise that resolves after load/init flow finishes.
 */
export async function loadInitialData(args: LoadStateArgs): Promise<void> {
    try {
        const loadResult = await args.plannerApi.loadState();
        const saved = loadResult.state;
        const savedRecord = toSavedRecord(saved);
        reportLoadRecovery(loadResult, args);
        const source = await resolveInitialSource(args.plannerApi, saved);
        applyLoadedData(saved, source, args);
        const preferences = args.normalizePreferences(saved?.preferences ?? {});
        const featureFlags = args.normalizeFeatureFlags(
            readFeatureFlags(saved, savedRecord),
        );
        args.setPreferences(preferences);
        args.setFeatureFlags(featureFlags);
        applyExperienceData(args, preferences, featureFlags);
        applySessionAndResultData(saved, args);
        args.onLoaded(saved, loadResult);
    } catch {
        args.setStatus("Failed to load initial data", true);
    }
}
