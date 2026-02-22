export const REMINDERS_AVAILABLE = false;
export const SOCIAL_FEATURES_AVAILABLE = false;
export const RECOMMENDATIONS_AVAILABLE = false;

/**
 * Ships a feature flag that may be unavailable based on conditions such as user settings or global feature flags.
 * If the feature is unavailable, it returns false regardless of the raw value.
 * @param rawValue - The raw value to be parsed as a boolean for the feature flag.
 * @param isAvailable - A boolean indicating whether the feature is available.
 * @returns A boolean representing whether the feature flag is considered enabled in the application.
 */
export function shippedFeatureFlag(
  rawValue: unknown,
  isAvailable: boolean,
): boolean {
  if (!isAvailable) {
    return false;
  }
  return Boolean(rawValue);
}

/**
 * Ships the reminder time setting, which may be unavailable based on feature flags or other conditions.
 * If the setting is unavailable or the value is invalid, it falls back to a default reminder time.
 * @param rawValue - The raw value to be parsed as the reminder time.
 * @param isAvailable - A boolean indicating whether the reminder time feature is available.
 * @param defaultReminderTime - The default reminder time to use if the feature is unavailable or the value is invalid.
 * @returns A string representing the reminder time to be used in the application.
 */
export function shippedReminderTime(
  rawValue: unknown,
  isAvailable: boolean,
  defaultReminderTime: string,
): string {
  if (!isAvailable) {
    return defaultReminderTime;
  }
  const value = String(rawValue ?? "").trim();
  if (!value) {
    return defaultReminderTime;
  }
  return value;
}
