type SessionsSetter = (sessions: unknown[]) => void;
type PlanResultSetter = (result: unknown) => void;

export type LoadedPlannerState = {
  settings?: unknown;
  books?: unknown;
  preferences?: unknown;
  feature_flags?: unknown;
  schedule_completions?: unknown;
  sessions?: Parameters<SessionsSetter>[0];
  last_result?: Parameters<PlanResultSetter>[0];
};

export type PlannerApi = {
  loadState: () => Promise<LoadedPlannerState | null | undefined>;
  sample: () => Promise<Pick<LoadedPlannerState, "settings" | "books">>;
  saveState: (state: unknown) => Promise<unknown>;
};
