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

type EstimateProgressLabelArgs = {
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
    const BOOK = args.getBookById(String(args.row.book_id ?? ""));
    const END_PAGES = Number(BOOK?.pages_total ?? 0) || null;
    return {
        changedInSession: true,
        endPages: END_PAGES,
        endPercent: 100,
        startPages: END_PAGES,
        startPercent: 0,
    };
}

function finishRowLabel(args: EstimateProgressLabelArgs): string {
    return labelForSnapshot(finishSnapshot(args));
}

function estimateSnapshotLabel(args: EstimateProgressLabelArgs): string {
    const SNAPSHOT = estimateSnapshotForRow({
        getBookById: args.getBookById,
        isSessionCompleted: args.isSessionCompleted ?? (() => false),
        row: args.row,
        state: args.state,
    });
    if (!SNAPSHOT) {
        return NO_ESTIMATE_LABEL;
    }
    return labelForSnapshot(SNAPSHOT);
}

/**
 * Builds end-of-session progress estimate label for a calendar row.
 * @param args - Estimate-label inputs for the target row.
 * @returns Human-readable estimate label.
 */
export function estimateProgressLabel(args: EstimateProgressLabelArgs): string {
    if (args.row.finish === true) {
        return finishRowLabel(args);
    }
    return estimateSnapshotLabel(args);
}
