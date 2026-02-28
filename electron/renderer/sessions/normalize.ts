import { type Session, type SessionInput } from "../../types/types.js";
import { uid } from "../dom.js";
import { toInt } from "./utils.js";

const SOURCE_TIMER: Session["source"] = "timer";
const SOURCE_MANUAL: Session["source"] = "manual";
const UNTITLED_SESSION = "Untitled";

/**
 * Compares sessions by `ended_at` descending for recent-first ordering.
 * @param left Left session.
 * @param right Right session.
 * @returns Negative/zero/positive comparison result.
 */
function compareByEndedAtDesc(left: Session, right: Session): number {
    return String(right.ended_at).localeCompare(String(left.ended_at));
}

/**
 * Normalizes session started/ended timestamps with sensible fallbacks.
 * @param session Raw session input.
 * @returns Normalized started/ended timestamp pair.
 */
function normalizedDates(session: SessionInput): {
    endedAt: string;
    startedAt: string;
} {
    const endedAtRaw = String(session.ended_at ?? session.endedAt ?? "").trim();
    let endedAt = endedAtRaw;
    if (endedAt.length === 0) {
        endedAt = new Date().toISOString();
    }

    const startedAtRaw = String(
        session.started_at ?? session.startedAt ?? "",
    ).trim();
    let startedAt = startedAtRaw;
    if (startedAt.length === 0) {
        startedAt = endedAt;
    }

    return { endedAt, startedAt };
}

/**
 * Normalizes optional pages-read input to non-negative integer or null.
 * @param value Raw pages-read value.
 * @returns Parsed pages-read value or `null`.
 */
function normalizedPagesRead(value?: number | string | null): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    return Math.max(0, toInt(value, 0));
}

/**
 * Normalizes raw source text to supported session source enum.
 * @param value Raw source value.
 * @returns `"manual"` when matched; otherwise `"timer"`.
 */
function normalizedSource(value?: string): Session["source"] {
    if (value === SOURCE_MANUAL) {
        return SOURCE_MANUAL;
    }
    return SOURCE_TIMER;
}

/**
 * Normalizes partial session input into canonical session model.
 * @param session Raw session input.
 * @returns Normalized session object.
 */
export function normalizeSession(session: SessionInput = {}): Session {
    const { endedAt, startedAt } = normalizedDates(session);
    const pagesRead = normalizedPagesRead(session.pages_read);
    const source = normalizedSource(session.source);

    return {
        book_id: String(session.book_id ?? ""),
        created_at: String(session.created_at ?? endedAt),
        ended_at: endedAt,
        id: String(session.id ?? uid()),
        minutes: Math.max(1, toInt(session.minutes, 1)),
        notes: String(session.notes ?? "").trim(),
        pages_read: pagesRead,
        source,
        started_at: startedAt,
        title: String(session.title ?? UNTITLED_SESSION),
    };
}

/**
 * Normalizes and sorts session lists in recent-first order.
 * @param rawSessions Raw session inputs.
 * @returns Normalized sessions sorted by `ended_at` descending.
 */
export function normalizeSessions(rawSessions: SessionInput[] = []): Session[] {
    let normalizedRawSessions: SessionInput[] = [];
    if (Array.isArray(rawSessions)) {
        normalizedRawSessions = rawSessions;
    }
    return normalizedRawSessions
        .map(normalizeSession)
        .sort(compareByEndedAtDesc);
}
