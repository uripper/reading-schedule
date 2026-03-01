import { type EstimateSnapshot } from "../../types/types.js";

export const NO_ESTIMATE_LABEL = "No estimate available";

/**
 * Formats estimate label including projected pages and percent.
 * @param snapshot Estimate snapshot.
 * @returns Formatted estimate label.
 */
export function estimateLabelWithPages(snapshot: EstimateSnapshot): string {
    const { startPages, endPages } = snapshot;
    if (startPages === null || endPages === null) {
        return NO_ESTIMATE_LABEL;
    }
    return `Estimated by end of this session: ${endPages} pages read (${snapshot.endPercent}% complete)`;
}

/**
 * Formats estimate label when page projection is unavailable.
 * @param snapshot Estimate snapshot.
 * @returns Formatted estimate label.
 */
export function estimateLabelWithoutPages(snapshot: EstimateSnapshot): string {
    return `Estimated by end of this session: ${snapshot.endPercent}% complete`;
}
