/** Renders and saves inline duration edits for a Schedule session. */
import { normalizedManualMinutes } from "../app/calendar_interactions/calendar_interactions_manual_helpers.ts";
import { bindSessionNumberEditor } from "./details_session_editor.ts";
import { metricLabel, metricValue } from "./details_session_metrics.ts";
import type { SessionCardArgs } from "./details_session_shared.ts";
import { parseOptionalNumber } from "./utils.ts";

const MIN_MINUTES = normalizedManualMinutes(0);

/** Saves through the existing schedule mutation and updates dependent projections. */
function saveDuration(input: HTMLInputElement, args: SessionCardArgs): boolean {
    const MINUTES = parseOptionalNumber(input.value);
    if (MINUTES === null) {
        return false;
    }
    const APPLIED = args.interactionHandlers.onSessionMinutesUpdated({
        minutes: normalizedManualMinutes(MINUTES),
        row: args.row,
    });
    if (APPLIED) {
        args.rerenderDetails();
    }
    return APPLIED;
}

/** Builds a compact duration summary with a numeric minutes editor. */
export function minutesFormForSession(args: SessionCardArgs): HTMLElement {
    const FORM = document.createElement("form");
    FORM.className = "day-session-metric";
    const MINUTES = normalizedManualMinutes(args.row.minutes);
    const VALUE = metricValue(`${MINUTES} minutes`);
    const INPUT = document.createElement("input");
    INPUT.type = "number";
    INPUT.className = "day-session-input";
    INPUT.min = String(MIN_MINUTES);
    INPUT.required = true;
    INPUT.value = String(MINUTES);
    INPUT.setAttribute("aria-label", "Duration (minutes)");
    FORM.append(metricLabel("Duration"), VALUE, INPUT);
    bindSessionNumberEditor(FORM, {
        input: INPUT,
        label: () => "duration",
        resetInput: () => {
            INPUT.value = String(MINUTES);
        },
        save: () => saveDuration(INPUT, args),
        value: VALUE,
    });
    return FORM;
}
