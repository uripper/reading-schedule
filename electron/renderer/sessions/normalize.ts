// @ts-nocheck
import { uid } from "../dom.js";
import { toInt } from "./utils.js";

function compareByEndedAtDesc(left, right) {
  return String(right.ended_at).localeCompare(String(left.ended_at));
}

export function normalizeSession(session = {}) {
  const endedAtRaw = String(session.ended_at || session.endedAt || "").trim();
  const startedAtRaw = String(session.started_at || session.startedAt || "").trim();
  const endedAt = endedAtRaw || new Date().toISOString();
  const startedAt = startedAtRaw || endedAt;

  let pagesRead = null;
  if (session.pages_read !== null && session.pages_read !== undefined && session.pages_read !== "") {
    pagesRead = Math.max(0, toInt(session.pages_read, 0));
  }

  let source = "timer";
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

export function normalizeSessions(rawSessions = []) {
  let normalizedRawSessions = [];
  if (Array.isArray(rawSessions)) {
    normalizedRawSessions = rawSessions;
  }
  return normalizedRawSessions.map(normalizeSession).sort(compareByEndedAtDesc);
}
