/**
 * Recursive JSON value accepted by state persistence APIs.
 */
export type SaveResult = { ok: true } | { ok: false; error: string };
