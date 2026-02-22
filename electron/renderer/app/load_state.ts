import type { Book } from "../books/types.js";
import type { Session } from "../sessions/normalize.js";
import type { FeatureFlags, Preferences } from "./experience/experience.js";
import type {
  LoadedPlannerState,
  PlannerApi,
  PlannerResult,
  PlannerSettings,
} from "./types.js";

type InitialDataSource = {
  settings?: PlannerSettings;
  books?: Book[];
};

type LoadStateArgs = {
  plannerApi: Pick<PlannerApi, "loadState" | "sample">;
  fillSettings: (settings?: PlannerSettings) => void;
  fillBooks: (books?: Book[]) => void;
  normalizePreferences: (raw: Partial<Preferences>) => Preferences;
  normalizeFeatureFlags: (raw: Partial<FeatureFlags>) => FeatureFlags;
  normalizeScheduleCompletions: (
    raw: Record<string, boolean>,
  ) => Record<string, boolean>;
  fillPreferencesUI: (
    preferences: Preferences,
    featureFlags: FeatureFlags,
  ) => void;
  applyPreferencesToDocument: (preferences: Preferences) => void;
  setPreferences: (preferences: Preferences) => void;
  setFeatureFlags: (featureFlags: FeatureFlags) => void;
  setScheduleCompletions: (
    scheduleCompletions: Record<string, boolean>,
  ) => void;
  setSessions: (sessions: Session[]) => void;
  applyLoadedResult: (result: PlannerResult | null) => void;
  updateTodayView: () => void;
  onLoaded: (saved: LoadedPlannerState | null | undefined) => void;
  setStatus: (message: string, isError?: boolean) => void;
};

function hasInitialSettingsAndBooks(
  source: LoadedPlannerState | null | undefined,
): source is InitialDataSource {
  return Boolean(source?.settings && source?.books);
}

async function resolveInitialSource(
  plannerApi: Pick<PlannerApi, "sample">,
  saved: LoadedPlannerState | null | undefined,
): Promise<InitialDataSource> {
  if (hasInitialSettingsAndBooks(saved)) {
    return saved;
  }
  return plannerApi.sample();
}

function applyLoadedData(
  saved: LoadedPlannerState | null | undefined,
  source: InitialDataSource,
  args: LoadStateArgs,
): void {
  args.fillSettings(source.settings);
  args.fillBooks(source.books);
  args.setScheduleCompletions(
    args.normalizeScheduleCompletions(saved?.schedule_completions || {}),
  );
}

function applySessionAndResultData(
  saved: LoadedPlannerState | null | undefined,
  args: LoadStateArgs,
): void {
  args.setSessions(saved?.sessions || []);
  args.applyLoadedResult(saved?.last_result || null);
  args.updateTodayView();
}

function applyExperienceData(
  args: LoadStateArgs,
  preferences: Preferences,
  featureFlags: FeatureFlags,
): void {
  args.fillPreferencesUI(preferences, featureFlags);
  args.applyPreferencesToDocument(preferences);
}

export async function loadInitialData(args: LoadStateArgs): Promise<void> {
  try {
    const saved = await args.plannerApi.loadState();
    const source = await resolveInitialSource(args.plannerApi, saved);
    applyLoadedData(saved, source, args);

    const preferences = args.normalizePreferences(saved?.preferences || {});
    const featureFlags = args.normalizeFeatureFlags(saved?.feature_flags || {});
    args.setPreferences(preferences);
    args.setFeatureFlags(featureFlags);
    applyExperienceData(args, preferences, featureFlags);
    applySessionAndResultData(saved, args);
    args.onLoaded(saved);
  } catch {
    args.setStatus("Failed to load initial data", true);
  }
}
