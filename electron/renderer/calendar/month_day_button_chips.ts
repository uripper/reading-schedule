interface CalendarRow {
  finish?: boolean;
  minutes?: number;
  title?: string;
}

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
export function chipClassNameForRow(row: CalendarRow): string {
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
  rows: CalendarRow[],
): void {
  rows.slice(0, 2).forEach((row) => {
    const chip = document.createElement("span");
    chip.className = chipClassNameForRow(row);
    chip.textContent = `${row.title ?? "Untitled"} - ${Number(row.minutes ?? 0)}m`;
    dayButton.append(chip);
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
  const extra = document.createElement("span");
  extra.className = "day-chip is-more";
  extra.textContent = `+${rowCount - 2} more`;
  dayButton.append(extra);
}

/**
 * Appends summary count and row chips to day buttons.
 * @param dayButton Day button node to append into.
 * @param rows Day rows to summarize.
 */
export function appendDayButtonSummary(
  dayButton: HTMLButtonElement,
  rows: CalendarRow[],
): void {
  const count = document.createElement("span");
  count.className = "day-event-count";
  count.textContent = plannedSessionText(rows.length);
  dayButton.append(count);

  appendVisibleRowChips(dayButton, rows);
  appendExtraRowChip(dayButton, rows.length);
}
