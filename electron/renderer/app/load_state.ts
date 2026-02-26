import type { Book } from "../books/types.js";
import type { Session } from "../sessions/normalize.js";
import type { FeatureFlags, Preferences } from "./experience/index.js";
import type {
  LoadedPlannerState,
  PlannerApi,
  PlannerResult,
  PlannerSettings,
} from "../../types/types.js";

interface InitialDataSource {
  settings?: PlannerSettings;
  books?: Book[];
}

interface LoadStateArgs {
  plannerApi: Pick<PlannerApi, "loadState" | "sample">;
  fillSettings(settings?: PlannerSettings): void;
  fillBooks(books?: Book[]): void;
  normalizePreferences(raw: Partial<Preferences>): Preferences;
  normalizeFeatureFlags(raw: Partial<FeatureFlags>): FeatureFlags;
  normalizeScheduleCompletions(
    raw: Record<string, boolean>,
  ): Record<string, boolean>;
  fillPreferencesUI(preferences: Preferences, featureFlags: FeatureFlags): void;
  applyPreferencesToDocument(preferences: Preferences): void;
  setPreferences(preferences: Preferences): void;
  setFeatureFlags(featureFlags: FeatureFlags): void;
  setScheduleCompletions(scheduleCompletions: Record<string, boolean>): void;
  setBlockedDayBooks(blockedDayBooks: Record<string, boolean>): void;
  setSessions(sessions: Session[]): void;
  applyLoadedResult(result: PlannerResult | null): void;
  updateTodayView(): void;
  onLoaded(saved: LoadedPlannerState | null | undefined): void;
  setStatus(message: string, isError?: boolean): void;
}

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
  args.fillSettings(source.settings);
  args.fillBooks(source.books);
  args.setScheduleCompletions(
    args.normalizeScheduleCompletions(saved?.schedule_completions ?? {}),
  );
  args.setBlockedDayBooks(
    normalizeBlockedDayBooks(
      saved?.blocked_day_books as Record<
        string,
        string | number | boolean | null | undefined
      > | undefined,
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
  args.setSessions(saved?.sessions ?? []);
  args.applyLoadedResult(saved?.last_result ?? null);
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
 * Falls back to sample data when saved state is missing required bootstrap fields.
 * @param args Runtime dependencies for loading, normalizing, and applying state.
 * @returns Promise that resolves after load/init flow finishes.
 */
export async function loadInitialData(args: LoadStateArgs): Promise<void> {
  try {
    const saved = await args.plannerApi.loadState();
    const source = await resolveInitialSource(args.plannerApi, saved);
    applyLoadedData(saved, source, args);

    const preferences = args.normalizePreferences(saved?.preferences ?? {});
    const featureFlags = args.normalizeFeatureFlags(saved?.feature_flags ?? {});
    args.setPreferences(preferences);
    args.setFeatureFlags(featureFlags);
    applyExperienceData(args, preferences, featureFlags);
    applySessionAndResultData(saved, args);
    args.onLoaded(saved);
  } catch {
    args.setStatus("Failed to load initial data", true);
  }
}
