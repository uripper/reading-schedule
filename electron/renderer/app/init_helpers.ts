import { el } from '../dom.js';
import { initSessionsUI } from '../sessions.js';
import { activateTab } from '../tabs.js';
import { createPlanController } from './plan_controller.js';
import { bindSettingsAutoPlanListeners } from './runtime_helpers.js';
import { activateSessionsAndStartTimer } from './today.js';

type Announce = (message: string, politeness?: string) => void;
type SetStatus = (message: string, isError?: boolean) => void;

type CreateSessionsArgs = {
  collectBooks: () => unknown[];
  onSessionsChanged: () => void;
  announce: Announce;
  setStatus: SetStatus;
};

type CreatePlanControllerArgs = Parameters<typeof createPlanController>[0];

type FinalizeInitialLoadArgs = {
  saved: { last_result?: { schedule?: unknown[] } | null } | null | undefined;
  setReady: () => void;
  queuePersist: () => void;
  queueAutoPlan: () => void;
  setStatus: SetStatus;
};

type BindTodayActionsArgs = {
  getLastResult: () => unknown;
  getSessionsUI: () => ReturnType<typeof initSessionsUI> | null;
};

export function setupSkipLink(): void {
  const skipLink = document.querySelector('.skip-link');
  if (!skipLink) {
    return;
  }
  skipLink.addEventListener('click', (event) => {
    event.preventDefault();
    el('mainContent').focus();
  });
}

export function createSessionsAppUI({
  collectBooks,
  onSessionsChanged,
  announce,
  setStatus,
}: CreateSessionsArgs): ReturnType<typeof initSessionsUI> {
  return initSessionsUI({
    getBooks: collectBooks,
    initialSessions: [],
    onSessionsChanged,
    announce,
    setStatus,
  });
}

export function createAppPlanControllerInstance(args: CreatePlanControllerArgs): ReturnType<typeof createPlanController> {
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
  document.addEventListener('input', queuePersist);
  document.addEventListener('change', queuePersist);

  const settingsPanel = el('tab-settings');
  bindSettingsAutoPlanListeners(
    settingsPanel,
    () => true,
    queueAutoPlan,
  );

  if (saved) {
    setStatus('Loaded saved data.');
  } else {
    setStatus('Loaded sample data.');
  }
  if (!saved?.last_result?.schedule?.length) {
    queueAutoPlan();
  }
}

export function bindTodayActions({ getLastResult, getSessionsUI }: BindTodayActionsArgs): void {
  el('startSessionFromTodayBtn').onclick = () => {
    activateSessionsAndStartTimer(getLastResult(), getSessionsUI(), activateTab);
  };
  el('viewScheduleFromTodayBtn').onclick = () => {
    activateTab('schedule', { focusPanel: true });
  };
}
