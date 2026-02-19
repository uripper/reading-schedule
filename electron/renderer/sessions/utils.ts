

export function toInt(value: string | number | undefined, fallback = 0) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.round(parsed);
  }
  return fallback;
}

export function isoLocalDayKey(iso: string | number | Date) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

export function formatTimeRange(startIso: string | number | Date, endIso: string | number | Date) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Unknown time";
  }
  const startFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  const endFormat = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
  return `${startFormat.format(start)} - ${endFormat.format(end)}`;
}

export function clampIndex(index: number, length: number) {
  if (length <= 0) {
    return -1;
  }
  return ((index % length) + length) % length;
}

export function formatTimer(totalSeconds: number) {
  const secondsPerMinute = 60;
  const minutes = Math.floor(totalSeconds / secondsPerMinute);
  const seconds = totalSeconds % secondsPerMinute;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function todayKey() {
  return isoLocalDayKey(new Date().toISOString());
}

export function minutesForDay(sessions: any[], dayKey: string) {
  return sessions
    .filter((session: { ended_at: any; }) => isoLocalDayKey(session.ended_at) === dayKey)
    .reduce((sum: number, session: { minutes: any; }) => sum + Number(session.minutes || 0), 0);
}

export function streakFromSessions(sessions: any[]) {
  const minuteMap = new Map();
  sessions.forEach((session: { ended_at: any; minutes: any; }) => {
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
