
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

function compareByEndedAtDesc(left: Session, right: Session): number {
  return String(right.ended_at).localeCompare(String(left.ended_at));
}

export function normalizeSession(session: SessionInput = {}): Session {
  const endedAtRaw = String(session.ended_at || session.endedAt || "").trim();
  const startedAtRaw = String(session.started_at || session.startedAt || "").trim();
  const endedAt = endedAtRaw || new Date().toISOString();
  const startedAt = startedAtRaw || endedAt;

  let pagesRead = null;
  if (session.pages_read !== null && session.pages_read !== undefined && session.pages_read !== "") {
    pagesRead = Math.max(0, toInt(session.pages_read, 0));
  }

  let source: "timer" | "manual" = "timer";
  if (session.source === "manual") {
    source = "manual";
  }

  return {
    id: String(session.id || uid()),
    book_id: String(session.book_id || ""),
    title: String(session.title || "Untitled"),
    started_at: startedAt,
    ended_at: endedAt,
    minutes: Math.max(1, toInt(session.minutes, 1)),
    pages_read: pagesRead,
    notes: String(session.notes || "").trim(),
    source,
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
