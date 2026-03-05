/**
 * Normalize schedule completions from local storage.
 * @param raw - The raw schedule completions object from local storage.
 * @returns A normalized schedule completions object with boolean values.
 */
export function normalizeScheduleCompletions(
    raw: Record<string, string | number | boolean | null | undefined> = {},
): Record<string, boolean> {
    const OUT: Record<string, boolean> = {};

    for (const [KEY, VALUE] of Object.entries(raw)) {
        if (!KEY) {
            continue;
        }
        OUT[KEY] = Boolean(VALUE);
    }
    return OUT;
}
