import { el } from "../../dom.js";
import type { Session } from "../../sessions/normalize.js";
import { activateTab } from "../../tabs.js";
import {
  completeTinyStart,
  createClosedFocusState,
  openFocusMode,
  startFocusSession,
  TINY_START_MINUTES,
} from "./today_focus.js";
import type { PlannerResult } from "../types.js";
import {
  findSessionRow,
  nextCompletionsWithRowMarkedComplete,
  readFocusSessionFromDataset,
  setFocusEntryButtonState,
  tinyStartSessionFromFocus,
} from "./today_focus_bindings_helpers.js";

const SESSION_UPDATE_EVENT = "today-focus-session-updated";

type SetStatus = (message: string, isError?: boolean) => void;

export type BindTodayFocusActionsArgs = {
  getLastResult: () => PlannerResult | null;
  getScheduleCompletions: () => Record<string, boolean>;
  setScheduleCompletions: (nextCompletions: Record<string, boolean>) => void;
  getSessions: () => Session[];
  setSessions: (nextSessions: Session[]) => void;
  queuePersist: () => void;
  updateTodayView: () => void;
  setStatus: SetStatus;
};

export function bindTodayFocusActions({
  getLastResult,
  getScheduleCompletions,
  setScheduleCompletions,
  getSessions,
  setSessions,
  queuePersist,
  updateTodayView,
  setStatus,
}: BindTodayFocusActionsArgs): void {
  const focusEntryButton = el<HTMLButtonElement>("startSessionFromTodayBtn");
  const focusPanel = el("todayFocusModePanel");
  const focusSessionText = el("todayFocusSessionText");
  const focusSessionMeta = el("todayFocusSessionMeta");
  const focusFeedback = el("todayFocusFeedback");
  const focusStartButton = el<HTMLButtonElement>("todayFocusStartBtn");
  const focusTinyStartButton = el<HTMLButtonElement>("todayFocusTinyStartBtn");
  const focusCompleteButton = el<HTMLButtonElement>("todayFocusCompleteBtn");

  let focusState = createClosedFocusState();
  const renderFocusMode = () => {
    setFocusEntryButtonState(focusEntryButton, focusState.isOpen);
    focusPanel.hidden = !focusState.isOpen;
    if (!focusState.isOpen) {
      return;
    }
    if (focusState.session) {
      focusSessionText.textContent = `Next: ${focusState.session.title} (${focusState.session.minutes} minutes)`;
      focusSessionMeta.textContent = `Scheduled for ${focusState.session.date}`;
    } else {
      focusSessionText.textContent = "No upcoming planned session.";
      focusSessionMeta.textContent = "Use Tiny Start to log a short reading sprint.";
    }
    focusStartButton.hidden = !focusState.session;
    focusStartButton.disabled = focusState.isStarted;
    focusCompleteButton.hidden = !focusState.isStarted || !focusState.session;
    focusFeedback.textContent = focusState.feedback;
  };

  const refreshFocusSession = () => {
    if (!focusState.isOpen || focusState.isStarted) {
      return;
    }
    const updatedSession = readFocusSessionFromDataset(focusEntryButton);
    focusState = {
      ...focusState,
      session: updatedSession,
    };
    renderFocusMode();
  };

  focusEntryButton.onclick = () => {
    if (focusState.isOpen) {
      focusState = createClosedFocusState();
      renderFocusMode();
      focusEntryButton.focus();
      return;
    }
    focusState = openFocusMode(readFocusSessionFromDataset(focusEntryButton));
    renderFocusMode();
    focusTinyStartButton.focus();
  };
  focusEntryButton.addEventListener(SESSION_UPDATE_EVENT, refreshFocusSession);
  focusStartButton.onclick = () => {
    focusState = startFocusSession(focusState);
    renderFocusMode();
    if (focusState.session) {
      setStatus(`Started "${focusState.session.title}".`);
      activateTab("schedule", { focusPanel: true });
    } else {
      setStatus("No planned session available to start.", true);
    }
  };
  focusTinyStartButton.onclick = () => {
    const tinyStartSession = tinyStartSessionFromFocus(focusState.session);
    setSessions([tinyStartSession, ...getSessions()]);
    queuePersist();
    updateTodayView();
    focusState = completeTinyStart(focusState);
    renderFocusMode();
    setStatus(`Logged Tiny Start (${TINY_START_MINUTES} minutes).`);
  };
  focusCompleteButton.onclick = () => {
    const row = findSessionRow(getLastResult(), focusState.session);
    if (!row) {
      setStatus("Could not find this planned session to mark complete.", true);
      return;
    }
    const nextCompletions = nextCompletionsWithRowMarkedComplete(
      getScheduleCompletions(),
      row,
    );
    setScheduleCompletions(nextCompletions);
    queuePersist();
    updateTodayView();
    const nextSession = readFocusSessionFromDataset(focusEntryButton);
    focusState = {
      ...openFocusMode(nextSession),
      feedback: `Marked "${row.title || "session"}" complete.`,
    };
    renderFocusMode();
    setStatus(`Marked "${row.title || "session"}" complete.`);
  };
  el("viewScheduleFromTodayBtn").onclick = () => {
    activateTab("schedule", { focusPanel: true });
  };
  renderFocusMode();
}
