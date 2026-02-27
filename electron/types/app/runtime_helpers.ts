import type { FeatureFlags, Preferences } from "../../renderer/app/experience/index.js";
import type { Book } from "../../renderer/books/types.js";
import type { Session } from "../../renderer/sessions/normalize.js";
import type { PlannerApi, PlannerResult, PlannerSettings } from "../types.js";

export interface PersistQueueState {
  ready: boolean;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  lastResult: PlannerResult | null;
}

export interface PersistQueueArgs {
  plannerApi: Pick<PlannerApi, "saveState">;
  state: PersistQueueState;
  getSessions(this: void): Session[];
  collectBooks(this: void): Book[];
  collectSettings(this: void): PlannerSettings;
  addLog(this: void, message: string): void;
}

export interface PersistQueue {
  persistDraft(): Promise<boolean>;
  queuePersist(): void;
}
