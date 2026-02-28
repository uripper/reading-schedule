import type {
    BindTodayFocusActionsArgs,
    TodayFocusDomRefs,
    TodayFocusState,
} from "../../../types/types.js";
import { el } from "../../dom.js";
import { activateTab } from "../../tabs.js";
import {
    completeTinyStart,
    createClosedFocusState,
    openFocusMode,
    startFocusSession,
    TINY_START_MINUTES,
} from "./today_focus.js";
import {
    nextCompletionsWithRowMarkedComplete,
    setFocusEntryButtonState,
    tinyStartSessionFromFocus,
} from "./today_focus_bindings_helpers.js";
import {
    findSessionRow,
    readFocusSessionFromDataset,
} from "./today_focus_session_match.js";

const SESSION_UPDATE_EVENT = "today-focus-session-updated";

/**
 * Resolves Today focus-mode DOM nodes used by focus action bindings.
 * @returns Collected DOM references for focus UI controls.
 */
function readTodayFocusDomRefs(): TodayFocusDomRefs {
    return {
        focusCompleteButton: el<HTMLButtonElement>("todayFocusCompleteBtn"),
        focusEntryButton: el<HTMLButtonElement>("startSessionFromTodayBtn"),
        focusFeedback: el("todayFocusFeedback"),
        focusPanel: el("todayFocusModePanel"),
        focusSessionMeta: el("todayFocusSessionMeta"),
        focusSessionText: el("todayFocusSessionText"),
        focusStartButton: el<HTMLButtonElement>("todayFocusStartBtn"),
        focusTinyStartButton: el<HTMLButtonElement>("todayFocusTinyStartBtn"),
    };
}

/**
 * Renders Today focus controls from the current focus-state snapshot.
 * @param refs Focus UI DOM references.
 * @param focusState Current Today focus-mode state.
 */
function renderFocusMode(
    refs: TodayFocusDomRefs,
    focusState: TodayFocusState,
): void {
    const {
        focusEntryButton,
        focusPanel,
        focusSessionText,
        focusSessionMeta,
        focusStartButton,
        focusCompleteButton,
        focusFeedback,
    } = refs;
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
        focusSessionMeta.textContent =
            "Use Tiny Start to log a short reading sprint.";
    }
    focusStartButton.hidden = !focusState.session;
    focusStartButton.disabled = focusState.isStarted;
    focusCompleteButton.hidden = !focusState.isStarted || !focusState.session;
    focusFeedback.textContent = focusState.feedback;
}

/**
 * Refreshes focus-session metadata from the Today entry button dataset.
 * @param refs Focus UI DOM references.
 * @param focusState Current focus-mode state.
 * @returns Updated state with latest session metadata when applicable.
 */
function refreshedFocusState(
    refs: TodayFocusDomRefs,
    focusState: TodayFocusState,
): TodayFocusState {
    if (!focusState.isOpen || focusState.isStarted) {
        return focusState;
    }
    return {
        ...focusState,
        session: readFocusSessionFromDataset(refs.focusEntryButton),
    };
}

/**
 * Binds Today focus-mode UI actions (open/start/tiny-start/complete).
 * @param args Focus action dependencies from runtime state and mutators.
 * @param args.getLastResult Returns the latest planner result.
 * @param args.getScheduleCompletions Returns current completion map.
 * @param args.setScheduleCompletions Persists updated completion map in state.
 * @param args.getSessions Returns normalized session history.
 * @param args.setSessions Replaces normalized session history.
 * @param args.queuePersist Queues draft persistence after state changes.
 * @param args.updateTodayView Re-renders the Today dashboard panel.
 * @param args.setStatus Publishes user-visible status messages.
 */
export function bindTodayFocusActions(args: BindTodayFocusActionsArgs): void {
    const refs = readTodayFocusDomRefs();
    let focusState = createClosedFocusState();
    const render = (): void => {
        renderFocusMode(refs, focusState);
    };
    const refreshFocusSession = (): void => {
        focusState = refreshedFocusState(refs, focusState);
        render();
    };

    refs.focusEntryButton.onclick = () => {
        if (focusState.isOpen) {
            focusState = createClosedFocusState();
            render();
            refs.focusEntryButton.focus();
            return;
        }
        focusState = openFocusMode(
            readFocusSessionFromDataset(refs.focusEntryButton),
        );
        render();
        refs.focusTinyStartButton.focus();
    };
    refs.focusEntryButton.addEventListener(
        SESSION_UPDATE_EVENT,
        refreshFocusSession,
    );
    refs.focusStartButton.onclick = () => {
        focusState = startFocusSession(focusState);
        render();
        if (focusState.session) {
            args.setStatus(`Started "${focusState.session.title}".`);
            activateTab("schedule", { focusPanel: true });
        } else {
            args.setStatus("No planned session available to start.", true);
        }
    };
    refs.focusTinyStartButton.onclick = () => {
        const tinyStartSession = tinyStartSessionFromFocus(focusState.session);
        args.setSessions([tinyStartSession, ...args.getSessions()]);
        args.queuePersist();
        args.updateTodayView();
        focusState = completeTinyStart(focusState);
        render();
        args.setStatus(`Logged Tiny Start (${TINY_START_MINUTES} minutes).`);
    };
    refs.focusCompleteButton.onclick = () => {
        const row = findSessionRow(args.getLastResult(), focusState.session);
        if (!row) {
            args.setStatus(
                "Could not find this planned session to mark complete.",
                true,
            );
            return;
        }
        const nextCompletions = nextCompletionsWithRowMarkedComplete(
            args.getScheduleCompletions(),
            row,
        );
        args.setScheduleCompletions(nextCompletions);
        args.queuePersist();
        args.updateTodayView();
        const nextSession = readFocusSessionFromDataset(refs.focusEntryButton);
        focusState = {
            ...openFocusMode(nextSession),
            feedback: `Marked "${row.title || "session"}" complete.`,
        };
        render();
        args.setStatus(`Marked "${row.title || "session"}" complete.`);
    };
    el("viewScheduleFromTodayBtn").onclick = () => {
        activateTab("schedule", { focusPanel: true });
    };
    render();
}
