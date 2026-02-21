const LEADING_THE_PREFIX = "the ";
const LEADING_THE_LENGTH = LEADING_THE_PREFIX.length;
const INITIAL_INDEX = 0;
const INITIAL_LENGTH = 1;

function normalizedText(value?: string | null): string {
  return String(value || "").trim();
}

export function titleSortKey(value?: string | null): string {
  const title = normalizedText(value);
  if (!title) {
    return "";
  }

  const lower = title.toLowerCase();
  if (!lower.startsWith(LEADING_THE_PREFIX)) {
    return title;
  }

  const withoutThe = title.slice(LEADING_THE_LENGTH).trimStart();
  if (!withoutThe) {
    return title;
  }
  return withoutThe;
}

export function titleInitialLetter(value?: string | null): string {
  const key = titleSortKey(value).trim();
  if (!key) {
    return "";
  }
  return key.slice(INITIAL_INDEX, INITIAL_LENGTH).toUpperCase();
}
