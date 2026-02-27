import type { Book } from "./types_books.js";
import type { Session } from "./types_core.js";
import type { PlannerResult, PlannerScheduleRow } from "./types_planner.js";
import type { FeatureFlags, Preferences } from "./types_experience.js";
import type { SetStatus } from "./types_app.js";

export interface TodayBookSummary {
  bookId: string;
  title: string;
  coverSrc: string;
  plannedMinutes: number;
  scheduledSessions: number;
  completedSessions: number;
}

export interface TodayScheduleSnapshot {
  nextUncompletedRow: PlannerScheduleRow | null;
  completedPlannedMinutes: number;
  scheduledSessions: number;
  completedSessions: number;
  books: TodayBookSummary[];
}

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

export interface FocusSession {
  bookId: string;
  date: string;
  minutes: number;
  sessionIndex: number | null;
  title: string;
}

export interface TodayFocusState {
  feedback: string;
  isOpen: boolean;
  isStarted: boolean;
  session: FocusSession | null;
}

export interface UpdateTodayDashboardArgs {
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  books: Book[];
  sessions: Session[];
  preferences: Preferences;
  featureFlags: FeatureFlags;
  defaultDailyGoalMinutes: number;
}

export interface TodayBookNavigationActions {
  activateBooksTab(): void;
  scrollToBook(bookId: string): void;
}
