import type {
    CalendarRowWithFinish,
    DetailInteractionHandlers,
} from "../../types/types.ts";
import { minutesFormForSession } from "./details_minutes_form.ts";
import {
    baseSessionItem,
    COMPLETE_ITEM_CLASS,
    COMPLETE_TOGGLE_LABEL,
    DAY_DETAILS_META_CLASS,
    removeSessionButton,
} from "./details_session_shared.ts";
import { sessionKeyFor } from "./utils.ts";

const COMPLETED_TEXT = "Completed";
const NOT_COMPLETED_TEXT = "Not completed";

function completionText(completed: boolean): string {
    if (completed) {
        return COMPLETED_TEXT;
    }
    return NOT_COMPLETED_TEXT;
}

function syncCompletedState(
    item: HTMLElement,
    status: HTMLElement,
    completed: boolean,
): void {
    const ITEM_NODE = item;
    const STATUS_NODE = status;
    ITEM_NODE.classList.toggle(COMPLETE_ITEM_CLASS, completed);
    STATUS_NODE.textContent = completionText(completed);
}

function completionToggle(checked: boolean): {
    input: HTMLInputElement;
    label: HTMLLabelElement;
} {
    const LABEL = document.createElement("label");
    LABEL.className = "day-complete-toggle";
    const INPUT = document.createElement("input");
    INPUT.type = "checkbox";
    INPUT.checked = checked;
    LABEL.append(INPUT, COMPLETE_TOGGLE_LABEL);
    return { input: INPUT, label: LABEL };
}

function completionStatusNode(): HTMLElement {
    const STATUS = document.createElement("p");
    STATUS.className = `${DAY_DETAILS_META_CLASS} day-session-status`;
    return STATUS;
}

function pastSessionSetup(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
): {
    completed: boolean;
    sessionKey: string;
    toggle: { input: HTMLInputElement; label: HTMLLabelElement };
} {
    const SESSION_KEY = sessionKeyFor(row);
    const COMPLETED = Boolean(
        interactionHandlers.isSessionCompleted(SESSION_KEY),
    );
    return {
        completed: COMPLETED,
        sessionKey: SESSION_KEY,
        toggle: completionToggle(COMPLETED),
    };
}

function bindCompletionToggle(args: {
    interactionHandlers: DetailInteractionHandlers;
    item: HTMLElement;
    rerenderDetails: () => void;
    row: CalendarRowWithFinish;
    sessionKey: string;
    status: HTMLElement;
    toggle: HTMLInputElement;
}): void {
    const TOGGLE_INPUT = args.toggle;
    TOGGLE_INPUT.onchange = () => {
        const CHECKED = Boolean(TOGGLE_INPUT.checked);
        syncCompletedState(args.item, args.status, CHECKED);
        args.interactionHandlers.onSessionCompletionChanged({
            completed: CHECKED,
            row: args.row,
            sessionKey: args.sessionKey,
        });
        args.rerenderDetails();
    };
}

function pastSessionNodes(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): {
    minutesForm: HTMLElement;
    removeButton: HTMLElement;
    status: HTMLElement;
} {
    return {
        minutesForm: minutesFormForSession(
            row,
            interactionHandlers,
            rerenderDetails,
        ),
        removeButton: removeSessionButton(
            row,
            interactionHandlers,
            rerenderDetails,
        ),
        status: completionStatusNode(),
    };
}

function appendPastSessionNodes(
    item: HTMLElement,
    toggleLabel: HTMLLabelElement,
    nodes: {
        minutesForm: HTMLElement;
        removeButton: HTMLElement;
        status: HTMLElement;
    },
): void {
    item.append(
        toggleLabel,
        nodes.status,
        nodes.minutesForm,
        nodes.removeButton,
    );
}

/**
 * Builds details row node for past sessions with completion toggle.
 * @param row - Calendar row.
 * @param interactionHandlers - Detail interaction handlers.
 * @param rerenderDetails - Details rerender callback.
 * @returns Rendered row element.
 */
export function buildPastSessionItem(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): HTMLElement {
    const ITEM = baseSessionItem(row);
    const SESSION = pastSessionSetup(row, interactionHandlers);
    const NODES = pastSessionNodes(row, interactionHandlers, rerenderDetails);
    syncCompletedState(ITEM, NODES.status, SESSION.completed);
    bindCompletionToggle({
        interactionHandlers,
        item: ITEM,
        rerenderDetails,
        row,
        sessionKey: SESSION.sessionKey,
        status: NODES.status,
        toggle: SESSION.toggle.input,
    });
    appendPastSessionNodes(ITEM, SESSION.toggle.label, NODES);
    return ITEM;
}
