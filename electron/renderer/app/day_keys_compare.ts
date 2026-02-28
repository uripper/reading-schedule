const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const MONTH_INDEX_OFFSET = 1;

/**
 * Validates strict local day-key format (`YYYY-MM-DD`) and calendar date ranges.
 * @param dayKey Candidate day key.
 * @returns True when the key is a valid calendar day.
 */
export function isValidDayKey(dayKey: string): boolean {
  if (!DAY_KEY_PATTERN.test(dayKey)) {
    return false;
  }
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!Number.isInteger(year)) {
    return false;
  }
  if (!Number.isInteger(month)) {
    return false;
  }
  if (!Number.isInteger(day)) {
    return false;
  }
  const parsed = new Date(year, month - MONTH_INDEX_OFFSET, day);
  if (parsed.getFullYear() !== year) {
    return false;
  }
  if (parsed.getMonth() !== month - MONTH_INDEX_OFFSET) {
    return false;
  }
  if (parsed.getDate() !== day) {
    return false;
  }
  return true;
}

/**
 * Compares two valid day keys using ISO lexical ordering.
 * @param left Left day key.
 * @param right Right day key.
 * @returns True when `left` is on or before `right`.
 */
export function isOnOrBeforeDay(left: string, right: string): boolean {
  if (!isValidDayKey(left)) {
    return false;
  }
  if (!isValidDayKey(right)) {
    return false;
  }
  return left <= right;
}
