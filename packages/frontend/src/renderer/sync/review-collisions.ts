/** Keeps conflict messages aligned with the books currently chosen in every row. */
import type { KoboProgress } from "@reading-schedule/contracts";
import type { createKoboReviewRow } from "./review-row.ts";

// audit-allow-local-types: Private row controls are derived from the renderer's DOM API.
type ReviewRow = ReturnType<typeof createKoboReviewRow>;

/** Groups source records by their current visible library selection. */
function groupedRecords(
    rows: readonly ReviewRow[],
): Map<string, KoboProgress[]> {
    const GROUPS = new Map<string, KoboProgress[]>();
    for (const ROW of rows) {
        const ID = ROW.matchId();
        if (ID === "") {
            continue;
        }
        const RECORDS = GROUPS.get(ID) ?? [];
        RECORDS.push(ROW.record);
        GROUPS.set(ID, RECORDS);
    }
    return GROUPS;
}

/** Names only actual competing rows, including matches changed through search. */
function refreshConflicts(rows: readonly ReviewRow[]): void {
    const GROUPS = groupedRecords(rows);
    for (const ROW of rows) {
        ROW.conflicts(
            (GROUPS.get(ROW.matchId()) ?? []).filter(
                (record) => record !== ROW.record,
            ),
        );
    }
}

/** Recomputes collisions after manual matching, adding a book, or ignoring a source. */
export function bindKoboRowCollisions(rows: readonly ReviewRow[]): void {
    const REFRESH = (): void => {
        refreshConflicts(rows);
    };
    for (const ROW of rows) {
        ROW.observeMatch(REFRESH);
    }
    REFRESH();
}
