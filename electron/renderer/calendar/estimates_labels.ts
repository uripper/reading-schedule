import type { EstimateSnapshot } from "./estimates_snapshot.js";

export const NO_ESTIMATE_LABEL = "No estimate available";

/**
 *
 * @param snapshot
 */
export function estimateLabelWithPages(snapshot: EstimateSnapshot): string {
  const { startPages, endPages } = snapshot;
  if (startPages === null || endPages === null) {
    return NO_ESTIMATE_LABEL;
  }
  return `Estimated by end of this session: ${endPages} pages read (${snapshot.endPercent}% complete)`;
}

/**
 *
 * @param snapshot
 */
export function estimateLabelWithoutPages(snapshot: EstimateSnapshot): string {
  return `Estimated by end of this session: ${snapshot.endPercent}% complete`;
}
