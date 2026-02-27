import type { FeatureFlags, Preferences } from "../../renderer/app/experience/index.js";
import type { Book } from "../../renderer/books/types.js";
import type { Session } from "../../renderer/sessions/normalize.js";
import type { PlannerResult, PlannerSettings } from "../types.js";

export interface DraftDataParams {
  sessions: Session[];
  collectBooks(): Book[];
  collectSettings(): PlannerSettings;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  lastResult: PlannerResult | null;
}

export type AddLog = (message: string) => void;
