const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks whether text is a valid `YYYY-MM-DD` day key.
 * @param dateKey Candidate day key.
 * @returns `true` when key shape and calendar date are valid.
 */
export function isValidDateKey(dateKey: string): boolean {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    return false;
  }
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

/**
 * Navigates to an estimated-finish day when the provided key is valid.
 * @param dateKey Estimated finish day key.
 * @param onNavigate Callback invoked with validated day key.
 * @returns `true` when navigation callback was invoked.
 */
export function navigateToEstimatedFinishDate(
  dateKey: string,
  onNavigate: (dateKey: string) => void,
): boolean {
  if (!isValidDateKey(dateKey)) {
    return false;
  }
  onNavigate(dateKey);
  return true;
}
