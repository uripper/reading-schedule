import type { CalendarDisplayRow } from "../../types/types.js";

/**
 * Returns compact planned-session summary text.
 * @param rowCount Number of sessions on a day.
 * @returns Summary label for day chip header.
 */
function plannedSessionText(rowCount: number): string {
    if (!rowCount) {
        return "No sessions";
    }
    return `${rowCount} planned`;
}

/**
 * Resolves chip class name based on finish/completion state.
 * @param row Day row to style.
 * @returns Class string for chip styling.
 */
export function chipClassNameForRow(row: CalendarDisplayRow): string {
    if (row.finish === true) {
        return "day-chip finish";
    }
    return "day-chip";
}

/**
 * Appends up to two visible row chips to a day button.
 * @param dayButton Day button node to append into.
 * @param rows Day rows to summarize.
 */
function appendVisibleRowChips(
    dayButton: HTMLButtonElement,
    rows: CalendarDisplayRow[],
): void {
    
    rows.slice(0, 2).forEach((row) => {
        const CHIP = document.createElement("span");
        CHIP.className = chipClassNameForRow(row);
        CHIP.textContent = `${row.title ?? "Untitled"} - ${Number(row.minutes ?? 0)}m`;
        dayButton.append(CHIP);
    });
}

/**
 * Appends overflow chip when day contains more than two sessions.
 * @param dayButton Day button node to append into.
 * @param rowCount Total number of day rows.
 */
function appendExtraRowChip(
    dayButton: HTMLButtonElement,
    rowCount: number,
): void {
    if (rowCount <= 2) {
        return;
    }
    const EXTRA = document.createElement("span");
    EXTRA.className = "day-chip is-more";
    EXTRA.textContent = `+${rowCount - 2} more`;
    dayButton.append(EXTRA);
}

/**
 * Appends summary count and row chips to day buttons.
 * @param dayButton Day button node to append into.
 * @param rows Day rows to summarize.
 */
export function appendDayButtonSummary(
    dayButton: HTMLButtonElement,
    rows: CalendarDisplayRow[],
): void {
    const COUNT = document.createElement("span");
    COUNT.className = "day-event-count";
    COUNT.textContent = plannedSessionText(rows.length);
    dayButton.append(COUNT);

    appendVisibleRowChips(dayButton, rows);
    appendExtraRowChip(dayButton, rows.length);
}
