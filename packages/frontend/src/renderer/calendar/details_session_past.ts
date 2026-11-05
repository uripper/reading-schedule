/** Renders Schedule cards for past sessions. */
import type {
    CalendarRowWithFinish,
    DetailInteractionHandlers,
} from "../../types/types.ts";
import { minutesFormForSession } from "./details_minutes_form.ts";
import { sessionMetric } from "./details_session_metrics.ts";
import {
    baseSessionItem,
    sessionCompletionButton,
} from "./details_session_shared.ts";
import { sessionKeyFor } from "./utils.ts";

/** Describes the recorded completion state of a past session. */
function statusMetric(completed: boolean): HTMLElement {
    if (completed) {
        return sessionMetric("Status", "Completed");
    }
    return sessionMetric("Status", "Not completed");
}

/** Shows past duration and completion without estimating historical progress. */
export function buildPastSessionItem(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): HTMLElement {
    const BOOK = interactionHandlers.getBookById(row.book_id);
    const ARGS = { row, interactionHandlers, rerenderDetails };
    const ITEM = baseSessionItem(ARGS, BOOK);
    const COMPLETED = interactionHandlers.isSessionCompleted(
        sessionKeyFor(row),
    );
    ITEM.classList.toggle("is-complete", COMPLETED);
    ITEM.append(
        minutesFormForSession(ARGS),
        statusMetric(COMPLETED),
        sessionCompletionButton(ARGS, COMPLETED),
    );
    return ITEM;
}
