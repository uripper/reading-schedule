/** Resolves projected end-of-session progress for calendar displays. */
import type {
    BookGetter,
    CompletionChecker,
    EstimateRow,
    EstimateSnapshot,
    EstimateState,
} from "../../types/types.ts";
import {
    estimateLabelWithoutPages,
    estimateLabelWithPages,
    NO_ESTIMATE_LABEL,
} from "./estimates_labels.ts";
import { estimateSnapshotForRow } from "./estimates_snapshot.ts";

type EstimateDisplayRow = EstimateRow & { finish?: boolean };

export type EstimateProgressLabelArgs = {
    row: EstimateDisplayRow;
    state: EstimateState;
    getBookById: BookGetter;
    isSessionCompleted?: CompletionChecker;
};

function labelForSnapshot(snapshot: EstimateSnapshot): string {
    if (snapshot.startPages !== null && snapshot.endPages !== null) {
        return estimateLabelWithPages(snapshot);
    }
    return estimateLabelWithoutPages(snapshot);
}

function finishSnapshot(args: EstimateProgressLabelArgs): EstimateSnapshot {
    const BOOK = args.getBookById(args.row.book_id);
    const END_PAGES = Number(BOOK?.pages_total ?? 0) || null;
    return {
        changedInSession: true,
        endPages: END_PAGES,
        endPercent: 100,
        startPages: END_PAGES,
        startPercent: 0,
    };
}

/** Resolves the projection used by the Ending Page metric. */
export function sessionProgressEstimate(
    args: EstimateProgressLabelArgs,
): EstimateSnapshot | null {
    if (args.row.finish === true) {
        return finishSnapshot(args);
    }
    return estimateSnapshotForRow({
        getBookById: args.getBookById,
        isSessionCompleted: args.isSessionCompleted ?? (() => false),
        row: args.row,
        state: args.state,
    });
}

/** Formats the projected progress as a sentence. */
export function estimateProgressLabel(args: EstimateProgressLabelArgs): string {
    const SNAPSHOT = sessionProgressEstimate(args);
    if (!SNAPSHOT) {
        return NO_ESTIMATE_LABEL;
    }
    return labelForSnapshot(SNAPSHOT);
}
