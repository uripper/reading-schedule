import {
    type BindTodayFocusActionsArgs,
    type TodayFocusDomRefs,
    type TodayFocusState,
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

interface FocusStateAccess {
    get: () => TodayFocusState;
    render: () => void;
    set: (nextState: TodayFocusState) => void;
}

interface FocusBindingContext {
    args: BindTodayFocusActionsArgs;
    refs: TodayFocusDomRefs;
    state: FocusStateAccess;
}

function bindFocusEntryButton(context: FocusBindingContext): void {
    context.refs.focusEntryButton.onclick = () => {
        if (context.state.get().isOpen) {
            context.state.set(createClosedFocusState());
            context.state.render();
            context.refs.focusEntryButton.focus();
            return;
        }
        const NEXT_STATE = openFocusMode(
            readFocusSessionFromDataset(context.refs.focusEntryButton),
        );
        context.state.set(NEXT_STATE);
        context.state.render();
        context.refs.focusTinyStartButton.focus();
    };
    context.refs.focusEntryButton.addEventListener(SESSION_UPDATE_EVENT, () => {
        const NEXT_STATE = refreshedFocusState(
            context.refs,
            context.state.get(),
        );
        context.state.set(NEXT_STATE);
        context.state.render();
    });
}

function bindFocusStartButton(context: FocusBindingContext): void {
    context.refs.focusStartButton.onclick = () => {
        context.state.set(startFocusSession(context.state.get()));
        context.state.render();
        const CURRENT_SESSION = context.state.get().session;
        if (CURRENT_SESSION) {
            context.args.setStatus(`Started "${CURRENT_SESSION.title}".`);
            activateTab("schedule", { focusPanel: true });
            return;
        }
        context.args.setStatus("No planned session available to start.", true);
    };
}

function bindFocusTinyStartButton(context: FocusBindingContext): void {
    context.refs.focusTinyStartButton.onclick = () => {
        const TINY_START_SESSION = tinyStartSessionFromFocus(
            context.state.get().session,
        );
        context.args.setSessions([
            TINY_START_SESSION,
            ...context.args.getSessions(),
        ]);
        context.args.queuePersist();
        context.args.updateTodayView();
        context.state.set(completeTinyStart(context.state.get()));
        context.state.render();
        context.args.setStatus(
            `Logged Tiny Start (${TINY_START_MINUTES} minutes).`,
        );
    };
}

function bindFocusCompleteButton(context: FocusBindingContext): void {
    context.refs.focusCompleteButton.onclick = () => {
        const ROW = findSessionRow(
            context.args.getLastResult(),
            context.state.get().session,
        );
        if (!ROW) {
            context.args.setStatus(
                "Could not find this planned session to mark complete.",
                true,
            );
            return;
        }
        const NEXT_COMPLETIONS = nextCompletionsWithRowMarkedComplete(
            context.args.getScheduleCompletions(),
            ROW,
        );
        context.args.setScheduleCompletions(NEXT_COMPLETIONS);
        context.args.queuePersist();
        context.args.updateTodayView();
        const NEXT_SESSION = readFocusSessionFromDataset(
            context.refs.focusEntryButton,
        );
        const SESSION_LABEL = ROW.title || "session";
        context.state.set({
            ...openFocusMode(NEXT_SESSION),
            feedback: `Marked "${SESSION_LABEL}" complete.`,
        });
        context.state.render();
        context.args.setStatus(`Marked "${SESSION_LABEL}" complete.`);
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
    const REFS = readTodayFocusDomRefs();
    let focusState = createClosedFocusState();
    const RENDER = (): void => {
        renderFocusMode(REFS, focusState);
    };
    const STATE: FocusStateAccess = {
        get: (): TodayFocusState => {
            return focusState;
        },
        render: RENDER,
        set: (nextState: TodayFocusState): void => {
            focusState = nextState;
        },
    };
    const CONTEXT: FocusBindingContext = { args, refs: REFS, state: STATE };
    bindFocusEntryButton(CONTEXT);
    bindFocusStartButton(CONTEXT);
    bindFocusTinyStartButton(CONTEXT);
    bindFocusCompleteButton(CONTEXT);
    el("viewScheduleFromTodayBtn").onclick = () => {
        activateTab("schedule", { focusPanel: true });
    };
    RENDER();
}
