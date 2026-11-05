/** Renders Schedule cards for upcoming sessions. */
import { minutesFormForSession } from "./details_minutes_form.ts";
import { endingMetric } from "./details_session_ending.ts";
import type { SessionCardWithEstimateArgs } from "./details_session_shared.ts";
import { baseSessionItem, sessionEstimate } from "./details_session_shared.ts";

/** Shows planned duration and a read-only progress projection for a future session. */
export function buildFutureSessionItem(
    args: SessionCardWithEstimateArgs,
): HTMLElement {
    const { row, interactionHandlers } = args;
    const BOOK = interactionHandlers.getBookById(row.book_id);
    const ITEM = baseSessionItem(args, BOOK);
    ITEM.append(
        minutesFormForSession(args),
        endingMetric(sessionEstimate(args)),
    );
    return ITEM;
}
