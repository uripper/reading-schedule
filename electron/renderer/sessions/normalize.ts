
import { uid } from "../dom.js";
import { toInt } from "./utils.js";

export type Session = {
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
};

type SessionInput = Omit<Partial<Session>, "pages_read" | "source"> & {
  endedAt?: string;
  startedAt?: string;
  pages_read?: number | string | null;
  source?: string;
};

const SOURCE_TIMER: Session["source"] = "timer";
const SOURCE_MANUAL: Session["source"] = "manual";
const UNTITLED_SESSION = "Untitled";

function compareByEndedAtDesc(left: Session, right: Session): number {
  return String(right.ended_at).localeCompare(String(left.ended_at));
}

function normalizedDateValue(primary?: string, alternate?: string): string {
  const rawValue = String(primary || alternate || "").trim();
  if (rawValue) {
    return rawValue;
  }
  return new Date().toISOString();
}

function normalizedStartedAt(primary: string | undefined, alternate: string | undefined, endedAt: string): string {
  const rawValue = String(primary || alternate || "").trim();
  if (rawValue) {
    return rawValue;
  }
  return endedAt;
}

function normalizedPagesRead(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return Math.max(0, toInt(value, 0));
}

function normalizedSource(value?: string): Session["source"] {
  if (value === SOURCE_MANUAL) {
    return SOURCE_MANUAL;
  }
  return SOURCE_TIMER;
}

export function normalizeSession(session: SessionInput = {}): Session {
  const endedAt = normalizedDateValue(session.ended_at, session.endedAt);
  const startedAt = normalizedStartedAt(session.started_at, session.startedAt, endedAt);
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

export function normalizeSessions(rawSessions: SessionInput[] = []): Session[] {
  let normalizedRawSessions: SessionInput[] = [];
  if (Array.isArray(rawSessions)) {
    normalizedRawSessions = rawSessions;
  }
  return normalizedRawSessions.map(normalizeSession).sort(compareByEndedAtDesc);
}
