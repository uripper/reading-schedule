export function normalizeScheduleCompletions(
  raw: Record<string, string | number | boolean | null | undefined> = {},
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (!key) {
      return;
    }
    out[key] = Boolean(value);
  });
  return out;
}
