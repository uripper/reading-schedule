/** Optional per-book reading time, revealed only when the reader opts in. */
import {
    MAX_SYNC_SESSION_MINUTES,
    MIN_SYNC_SESSION_MINUTES,
    SYNC_SESSION_MINUTES_SCHEMA,
} from "@reading-schedule/contracts";
import { syncElement } from "./dom.ts";

/** Builds an associated numeric field without guessing how long the reader read. */
function minutesField(title: string) {
    const FIELD = syncElement("label", "Minutes read");
    FIELD.className = "sync-session-minutes";
    FIELD.hidden = true;
    const INPUT = syncElement("input");
    INPUT.type = "number";
    INPUT.min = String(MIN_SYNC_SESSION_MINUTES);
    INPUT.max = String(MAX_SYNC_SESSION_MINUTES);
    INPUT.step = "1";
    INPUT.inputMode = "numeric";
    INPUT.setAttribute("aria-label", `Minutes read for ${title}`);
    FIELD.append(INPUT);
    return {
        field: FIELD,
        input: INPUT,
        read: () => readMinutes(INPUT, title),
    };
}

/** Validates opted-in time before any progress or session is persisted. */
function readMinutes(input: HTMLInputElement, title: string): number {
    const RESULT = SYNC_SESSION_MINUTES_SCHEMA.safeParse(Number(input.value));
    if (RESULT.success) {
        return RESULT.data;
    }
    input.focus();
    throw new Error(
        `Enter a whole number of minutes from ${MIN_SYNC_SESSION_MINUTES} to ${MAX_SYNC_SESSION_MINUTES} for “${title}”.`,
    );
}

/** Creates an opt-in checkbox and a minutes input for a single synced book. */
export function createSyncSessionControl(title: string) {
    const ELEMENT = syncElement("div");
    ELEMENT.className = "sync-session";
    const LABEL = syncElement("label");
    const CHECK = syncElement("input");
    CHECK.type = "checkbox";
    CHECK.checked = false;
    CHECK.setAttribute("aria-label", `Add session to today for ${title}`);
    LABEL.append(CHECK, syncElement("span", "Add session to today?"));
    const MINUTES = minutesField(title);
    ELEMENT.append(LABEL, MINUTES.field);
    CHECK.addEventListener("change", () => {
        MINUTES.field.hidden = !CHECK.checked;
        if (CHECK.checked) {
            MINUTES.input.focus();
        }
    });
    return sessionController(ELEMENT, CHECK, MINUTES);
}

/** Keeps disabled or unselected sync rows from contributing reading time. */
function sessionController(
    element: HTMLElement,
    check: HTMLInputElement,
    minutes: ReturnType<typeof minutesField>,
) {
    return {
        element,
        minutes: (): number | undefined => {
            if (!check.checked) {
                return undefined;
            }
            return minutes.read();
        },
        setEnabled: (enabled: boolean): void => {
            const CHECK = check;
            const INPUT = minutes.input;
            CHECK.disabled = !enabled;
            INPUT.disabled = !enabled;
        },
    };
}
