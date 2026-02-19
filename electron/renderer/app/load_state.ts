import type { Book } from '../books/types.js';
import type { FeatureFlags, Preferences } from './experience.js';
import type { PlannerApi } from './types.js';

type InitialDataSource = {
  settings?: Record<string, unknown>;
  books?: Book[];
};

type LoadedPlannerState = (InitialDataSource & {
  preferences?: Record<string, unknown>;
  feature_flags?: Record<string, unknown>;
  schedule_completions?: Record<string, unknown>;
  sessions?: unknown[];
  last_result?: { schedule?: unknown[] } | null;
}) | null | undefined;

type LoadStateArgs = {
  plannerApi: PlannerApi;
  fillSettings: (settings?: Record<string, unknown>) => void;
  fillBooks: (books?: Book[]) => void;
  normalizePreferences: (raw: Record<string, unknown>) => Preferences;
  normalizeFeatureFlags: (raw: Record<string, unknown>) => FeatureFlags;
  normalizeScheduleCompletions: (raw: Record<string, unknown>) => Record<string, boolean>;
  fillPreferencesUI: (preferences: Preferences, featureFlags: FeatureFlags) => void;
  applyPreferencesToDocument: (preferences: Preferences) => void;
  setPreferences: (preferences: Preferences) => void;
  setFeatureFlags: (featureFlags: FeatureFlags) => void;
  setScheduleCompletions: (scheduleCompletions: Record<string, boolean>) => void;
  setSessions: (sessions: unknown[]) => void;
  applyLoadedResult: (result: { schedule?: unknown[] } | null) => void;
  updateTodayView: () => void;
  onLoaded: (saved: LoadedPlannerState) => void;
  setStatus: (message: string, isError?: boolean) => void;
};

function hasInitialSettingsAndBooks(source: LoadedPlannerState): source is InitialDataSource {
  return Boolean(source?.settings && source?.books);
}

async function resolveInitialSource(
  plannerApi: PlannerApi,
  saved: LoadedPlannerState,
): Promise<InitialDataSource> {
  if (hasInitialSettingsAndBooks(saved)) {
    return saved;
  }
  return await plannerApi.sample();
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Failed to load initial data';
}

function applyLoadedData(saved: LoadedPlannerState, source: InitialDataSource, args: LoadStateArgs): void {
  args.fillSettings(source.settings);
  args.fillBooks(source.books);
  args.setScheduleCompletions(args.normalizeScheduleCompletions(saved?.schedule_completions || {}));
}

function applySessionAndResultData(saved: LoadedPlannerState, args: LoadStateArgs): void {
  args.setSessions(saved?.sessions || []);
  args.applyLoadedResult(saved?.last_result || null);
  args.updateTodayView();
}

function applyExperienceData(args: LoadStateArgs, preferences: Preferences, featureFlags: FeatureFlags): void {
  args.fillPreferencesUI(preferences, featureFlags);
  args.applyPreferencesToDocument(preferences);
}

export async function loadInitialData(args: LoadStateArgs): Promise<void> {
  try {
    const saved = (await args.plannerApi.loadState()) as LoadedPlannerState;
    const source = await resolveInitialSource(args.plannerApi, saved);
    applyLoadedData(saved, source, args);

    const preferences = args.normalizePreferences(saved?.preferences || {});
    const featureFlags = args.normalizeFeatureFlags(saved?.feature_flags || {});
    args.setPreferences(preferences);
    args.setFeatureFlags(featureFlags);
    applyExperienceData(args, preferences, featureFlags);
    applySessionAndResultData(saved, args);
    args.onLoaded(saved);
  } catch (error) {
    args.setStatus(loadErrorMessage(error), true);
  }
}
