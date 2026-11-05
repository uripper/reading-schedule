/** Renders Schedule cards for today's sessions. */
import type { Book } from "../../types/types.ts";
import { minutesFormForSession } from "./details_minutes_form.ts";
import { endingMetric } from "./details_session_ending.ts";
import type { EndingMetricValues } from "./details_session_ending.ts";
import type { SessionCardWithEstimateArgs } from "./details_session_shared.ts";
import {
    baseSessionItem,
    sessionCompletionButton,
    sessionEstimate,
} from "./details_session_shared.ts";
import { sessionKeyFor } from "./utils.ts";

/** Saves the recorded ending value through the existing progress mutation. */
function saveEndingValue(
    args: SessionCardWithEstimateArgs,
    values: EndingMetricValues,
): EndingMetricValues | null {
    const UPDATED = args.interactionHandlers.onSessionProgressUpdated({
        bookId: args.row.book_id,
        pagesRead: values.pages,
        progressPercent: values.percent,
        row: args.row,
    });
    if (UPDATED === null) {
        return null;
    }
    return { pages: UPDATED.pages_read, percent: UPDATED.progress_percent };
}

/** Keeps the projection visible until the session is completed. */
function todayProgressEditor(
    args: SessionCardWithEstimateArgs,
    book: Book,
    completed: boolean,
): HTMLElement {
    let values = sessionEstimate(args);
    if (completed) {
        values = { pages: book.pages_read, percent: book.progress_percent };
    }
    return endingMetric(values, (updated) => saveEndingValue(args, updated));
}

/** Shows editable duration and progress alongside the completion action. */
export function buildTodaySessionItem(
    args: SessionCardWithEstimateArgs,
): HTMLElement {
    const { row, interactionHandlers } = args;
    const BOOK = interactionHandlers.getBookById(row.book_id);
    const ITEM = baseSessionItem(args, BOOK);
    const COMPLETED = interactionHandlers.isSessionCompleted(
        sessionKeyFor(row),
    );
    ITEM.classList.toggle("is-complete", COMPLETED);
    ITEM.append(minutesFormForSession(args));
    if (BOOK !== null) {
        ITEM.append(todayProgressEditor(args, BOOK, COMPLETED));
    }
    ITEM.append(sessionCompletionButton(args, COMPLETED));
    return ITEM;
}
