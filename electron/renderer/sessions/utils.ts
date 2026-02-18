// @ts-nocheck

export function toInt(value, fallback = 0) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.round(parsed);
  }
  return fallback;
}

export function isoLocalDayKey(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

export function formatTimeRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Unknown time";
  }
  const startFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  const endFormat = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
  return `${startFormat.format(start)} - ${endFormat.format(end)}`;
}

export function clampIndex(index, length) {
  if (length <= 0) {
    return -1;
  }
  return ((index % length) + length) % length;
}

export function formatTimer(totalSeconds) {
  const secondsPerMinute = 60;
  const minutes = Math.floor(totalSeconds / secondsPerMinute);
  const seconds = totalSeconds % secondsPerMinute;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function todayKey() {
  return isoLocalDayKey(new Date().toISOString());
}

export function minutesForDay(sessions, dayKey) {
  return sessions
    .filter((session) => isoLocalDayKey(session.ended_at) === dayKey)
    .reduce((sum, session) => sum + Number(session.minutes || 0), 0);
}

export function streakFromSessions(sessions) {
  const minuteMap = new Map();
  sessions.forEach((session) => {
    const key = isoLocalDayKey(session.ended_at);
    if (!key) {
      return;
    }
    minuteMap.set(key, (minuteMap.get(key) || 0) + Number(session.minutes || 0));
  });

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = isoLocalDayKey(cursor.toISOString());
    if ((minuteMap.get(key) || 0) <= 0) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
