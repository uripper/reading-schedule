import type {
    BookGetter,
    CompletionChecker,
    EstimateRow,
    EstimateState,
} from "../../types/types.ts";
import {
    estimateLabelWithoutPages,
    estimateLabelWithPages,
    NO_ESTIMATE_LABEL,
} from "./estimates_labels.ts";
import { estimateSnapshotForRow } from "./estimates_snapshot.ts";

type EstimateProgressLabelArgs = {
    row: EstimateRow;
    state: EstimateState;
    getBookById: BookGetter;
    isSessionCompleted?: CompletionChecker;
};

/**
 * Builds end-of-session progress estimate label for a calendar row.
 * @param args - Estimate-label inputs for the target row.
 * @returns Human-readable estimate label.
 */
export function estimateProgressLabel(args: EstimateProgressLabelArgs): string {
    const SNAPSHOT = estimateSnapshotForRow({
        getBookById: args.getBookById,
        isSessionCompleted: args.isSessionCompleted ?? (() => false),
        row: args.row,
        state: args.state,
    });
    if (!SNAPSHOT) {
        return NO_ESTIMATE_LABEL;
    }
    if (SNAPSHOT.startPages !== null && SNAPSHOT.endPages !== null) {
        return estimateLabelWithPages(SNAPSHOT);
    }
    return estimateLabelWithoutPages(SNAPSHOT);
}
