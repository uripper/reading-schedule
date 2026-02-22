export const REMINDERS_AVAILABLE = false;
export const SOCIAL_FEATURES_AVAILABLE = false;
export const RECOMMENDATIONS_AVAILABLE = false;

export function shippedFeatureFlag(
  rawValue: unknown,
  isAvailable: boolean,
): boolean {
  if (!isAvailable) {
    return false;
  }
  return Boolean(rawValue);
}

export function shippedReminderTime(
  rawValue: unknown,
  isAvailable: boolean,
  defaultReminderTime: string,
): string {
  if (!isAvailable) {
    return defaultReminderTime;
  }
  const value = String(rawValue || "").trim();
  if (!value) {
    return defaultReminderTime;
  }
  return value;
}
