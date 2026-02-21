import type { EstimateSnapshot } from "./estimates_snapshot.js";

export const NO_ESTIMATE_LABEL = "No estimate available";

export function estimateLabelWithPages(snapshot: EstimateSnapshot): string {
  const { startPages, endPages } = snapshot;
  if (startPages === null || endPages === null) {
    return NO_ESTIMATE_LABEL;
  }
  if (!snapshot.changedInSession) {
    return `Estimated by end of this session: ${endPages} pages read (${snapshot.endPercent}% complete)`;
  }
  return `Estimated before session: ${startPages} pages (${snapshot.startPercent}%) -> after session: ${endPages} pages (${snapshot.endPercent}%)`;
}

export function estimateLabelWithoutPages(snapshot: EstimateSnapshot): string {
  if (!snapshot.changedInSession) {
    return `Estimated by end of this session: ${snapshot.endPercent}% complete`;
  }
  return `Estimated before session: ${snapshot.startPercent}% -> after session: ${snapshot.endPercent}%`;
}
