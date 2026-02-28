import type {
    BookGetter,
    CompletionChecker,
    EstimateRow,
    EstimateState,
} from "../../types/types.js";
import {
    estimateLabelWithoutPages,
    estimateLabelWithPages,
    NO_ESTIMATE_LABEL,
} from "./estimates_labels.js";
import { estimateSnapshotForRow } from "./estimates_snapshot.js";

/**
 * Builds end-of-session progress estimate label for a calendar row.
 * @param row Target estimate row.
 * @param state Estimate state context.
 * @param getBookById Book lookup function.
 * @param isSessionCompleted Completion checker.
 * @returns Human-readable estimate label.
 */
export function estimateProgressLabel(
    row: EstimateRow,
    state: EstimateState,
    getBookById: BookGetter,
    isSessionCompleted: CompletionChecker = () => false,
): string {
    const snapshot = estimateSnapshotForRow(
        row,
        state,
        getBookById,
        isSessionCompleted,
    );
    if (!snapshot) {
        return NO_ESTIMATE_LABEL;
    }
    if (snapshot.startPages !== null && snapshot.endPages !== null) {
        return estimateLabelWithPages(snapshot);
    }
    return estimateLabelWithoutPages(snapshot);
}
