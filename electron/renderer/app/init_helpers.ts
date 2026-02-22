import { el } from "../dom.js";
import { activateTab } from "../tabs.js";
import { createPlanController } from "./plan_controller.js";
import { bindSettingsAutoPlanListeners } from "./runtime_helpers.js";
import {
  completeFocusSession,
  completeTinyStart,
  createClosedFocusState,
  exitFocusMode,
  openFocusMode,
  startFocusSession,
  type FocusSession,
} from "./today_focus.js";
import type { PlannerResult } from "./types.js";

type SetStatus = (message: string, isError?: boolean) => void;

type CreatePlanControllerArgs = Parameters<typeof createPlanController>[0];

type FinalizeInitialLoadArgs = {
  saved: { last_result?: PlannerResult | null } | null | undefined;
  setReady: () => void;
  queuePersist: () => void;
  queueAutoPlan: () => void;
  setStatus: SetStatus;
};

export function setupSkipLink(): void {
  const skipLink = document.querySelector(".skip-link");
  if (!skipLink) {
    return;
  }
  skipLink.addEventListener("click", (event) => {
    event.preventDefault();
    el("mainContent").focus();
  });
}

export function createAppPlanControllerInstance(
  args: CreatePlanControllerArgs,
): ReturnType<typeof createPlanController> {
  return createPlanController(args);
}

export function finalizeInitialLoad({
  saved,
  setReady,
  queuePersist,
  queueAutoPlan,
  setStatus,
}: FinalizeInitialLoadArgs): void {
  setReady();
  document.addEventListener("input", queuePersist);
  document.addEventListener("change", queuePersist);

  const settingsPanel = el("tab-settings");
  bindSettingsAutoPlanListeners(settingsPanel, () => true, queueAutoPlan);

  if (saved) {
    setStatus("Loaded saved data.");
  } else {
    setStatus("Loaded sample data.");
  }
  queueAutoPlan();
}

export function bindTodayActions(): void {
  const focusEntryButton = el<HTMLButtonElement>("startSessionFromTodayBtn");
  const focusPanel = el("todayFocusModePanel");
  const focusSessionText = el("todayFocusSessionText");
  const focusSessionMeta = el("todayFocusSessionMeta");
  const focusFeedback = el("todayFocusFeedback");
  const focusStartButton = el<HTMLButtonElement>("todayFocusStartBtn");
  const focusTinyStartButton = el<HTMLButtonElement>("todayFocusTinyStartBtn");
  const focusCompleteButton = el<HTMLButtonElement>("todayFocusCompleteBtn");
  const focusExitButton = el<HTMLButtonElement>("todayFocusExitBtn");

  const readFocusSessionFromDataset = (): FocusSession | null => {
    const title = String(focusEntryButton.dataset.focusSessionTitle || "").trim();
    const date = String(focusEntryButton.dataset.focusSessionDate || "").trim();
    const rawMinutes = Number(focusEntryButton.dataset.focusSessionMinutes || 0);
    if (!title || !date || !Number.isFinite(rawMinutes) || rawMinutes <= 0) {
      return null;
    }
    return {
      date,
      minutes: Math.max(1, Math.round(rawMinutes)),
      title,
    };
  };

  let focusState = createClosedFocusState();
  const renderFocusMode = () => {
    focusPanel.hidden = !focusState.isOpen;
    if (!focusState.isOpen) {
      return;
    }
    if (focusState.session) {
      focusSessionText.textContent = `Next: ${focusState.session.title} (${focusState.session.minutes} minutes)`;
      focusSessionMeta.textContent = `Scheduled for ${focusState.session.date}`;
    } else {
      focusSessionText.textContent = "No upcoming planned session.";
      focusSessionMeta.textContent = "Use Tiny Start for a short reading sprint.";
    }
    focusStartButton.disabled = !focusState.session || focusState.isStarted;
    focusCompleteButton.hidden = !focusState.isStarted;
    focusFeedback.textContent = focusState.feedback;
  };

  focusEntryButton.onclick = () => {
    focusState = openFocusMode(readFocusSessionFromDataset());
    renderFocusMode();
    focusStartButton.focus();
  };
  focusStartButton.onclick = () => {
    focusState = startFocusSession(focusState);
    renderFocusMode();
  };
  focusTinyStartButton.onclick = () => {
    focusState = completeTinyStart(focusState);
    renderFocusMode();
  };
  focusCompleteButton.onclick = () => {
    focusState = completeFocusSession(focusState);
    renderFocusMode();
  };
  focusExitButton.onclick = () => {
    focusState = exitFocusMode(focusState);
    renderFocusMode();
    focusEntryButton.focus();
  };
  el("viewScheduleFromTodayBtn").onclick = () => {
    activateTab("schedule", { focusPanel: true });
  };
}
