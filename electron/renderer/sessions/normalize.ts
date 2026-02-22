import { uid } from "../dom.js";
import { toInt } from "./utils.js";

export interface Session {
  id: string;
  book_id: string;
  title: string;
  started_at: string;
  ended_at: string;
  minutes: number;
  pages_read: number | null;
  notes: string;
  source: "timer" | "manual";
  created_at: string;
}

type SessionInput = Omit<Partial<Session>, "pages_read" | "source"> & {
  endedAt?: string;
  startedAt?: string;
  pages_read?: number | string | null;
  source?: string;
};

const SOURCE_TIMER: Session["source"] = "timer";
const SOURCE_MANUAL: Session["source"] = "manual";
const UNTITLED_SESSION = "Untitled";

/**
 *
 * @param left
 * @param right
 */
function compareByEndedAtDesc(left: Session, right: Session): number {
  return String(right.ended_at).localeCompare(String(left.ended_at));
}

/**
 *
 * @param session
 */
function normalizedDates(session: SessionInput): {
  endedAt: string;
  startedAt: string;
} {
  const endedAtRaw = String(session.ended_at || session.endedAt || "").trim();
  let endedAt = endedAtRaw;
  if (!endedAt) {
    endedAt = new Date().toISOString();
  }

  const startedAtRaw = String(
    session.started_at || session.startedAt || "",
  ).trim();
  let startedAt = startedAtRaw;
  if (!startedAt) {
    startedAt = endedAt;
  }

  return { endedAt, startedAt };
}

/**
 *
 * @param value
 */
function normalizedPagesRead(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return Math.max(0, toInt(value, 0));
}

/**
 *
 * @param value
 */
function normalizedSource(value?: string): Session["source"] {
  if (value === SOURCE_MANUAL) {
    return SOURCE_MANUAL;
  }
  return SOURCE_TIMER;
}

/**
 *
 * @param session
 */
export function normalizeSession(session: SessionInput = {}): Session {
  const { endedAt, startedAt } = normalizedDates(session);
  const pagesRead = normalizedPagesRead(session.pages_read);
  const source = normalizedSource(session.source);

  return {
    source,
    id: String(session.id || uid()),
    book_id: String(session.book_id || ""),
    title: String(session.title || UNTITLED_SESSION),
    started_at: startedAt,
    ended_at: endedAt,
    minutes: Math.max(1, toInt(session.minutes, 1)),
    pages_read: pagesRead,
    notes: String(session.notes || "").trim(),
    created_at: String(session.created_at || endedAt),
  };
}

/**
 *
 * @param rawSessions
 */
export function normalizeSessions(rawSessions: SessionInput[] = []): Session[] {
  let normalizedRawSessions: SessionInput[] = [];
  if (Array.isArray(rawSessions)) {
    normalizedRawSessions = rawSessions;
  }
  return normalizedRawSessions.map(normalizeSession).sort(compareByEndedAtDesc);
}
