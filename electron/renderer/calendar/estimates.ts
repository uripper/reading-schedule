import {
  estimateLabelWithPages,
  estimateLabelWithoutPages,
  NO_ESTIMATE_LABEL,
} from "./estimates_labels.js";
import {
  estimateSnapshotForRow,
  type BookGetter,
  type CompletionChecker,
  type EstimateRow,
  type EstimateState,
} from "./estimates_snapshot.js";

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
