interface CalendarRow {
  finish?: boolean;
  minutes?: number;
  title?: string;
}

/**
 *
 * @param rowCount
 */
function plannedSessionText(rowCount: number): string {
  if (!rowCount) {
    return "No sessions";
  }
  return `${rowCount} planned`;
}

/**
 *
 * @param dayButton
 * @param rows
 */
function appendVisibleRowChips(
  dayButton: HTMLButtonElement,
  rows: CalendarRow[],
): void {
  rows.slice(0, 2).forEach((row) => {
    const chip = document.createElement("span");
    chip.className = "day-chip";
    if (row.finish) {
      chip.className = "day-chip finish";
    }
    chip.textContent = `${row.title || "Untitled"} - ${Number(row.minutes || 0)}m`;
    dayButton.append(chip);
  });
}

/**
 *
 * @param dayButton
 * @param rowCount
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
 *
 * @param dayButton
 * @param rows
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
