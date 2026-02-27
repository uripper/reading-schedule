import type { Session } from "../../../renderer/sessions/normalize.js";
import type { PlannerResult } from "../../types.js";

export type SetStatus = (message: string, isError?: boolean) => void;

export interface TodayFocusDomRefs {
  focusCompleteButton: HTMLButtonElement;
  focusEntryButton: HTMLButtonElement;
  focusFeedback: HTMLElement;
  focusPanel: HTMLElement;
  focusSessionMeta: HTMLElement;
  focusSessionText: HTMLElement;
  focusStartButton: HTMLButtonElement;
  focusTinyStartButton: HTMLButtonElement;
}

export interface BindTodayFocusActionsArgs {
  getLastResult(): PlannerResult | null;
  getScheduleCompletions(): Record<string, boolean>;
  setScheduleCompletions(nextCompletions: Record<string, boolean>): void;
  getSessions(): Session[];
  setSessions(nextSessions: Session[]): void;
  queuePersist(): void;
  updateTodayView(): void;
  setStatus: SetStatus;
}
