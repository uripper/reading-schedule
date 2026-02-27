import type { CalendarDisplayRow } from "./month.js";

export interface DayStyleFlags {
  hasFinishRow: boolean;
  isMuted: boolean;
  isPast: boolean;
  isSelected: boolean;
  isToday: boolean;
}

export interface DayStyleFlagsArgs {
  date: Date;
  firstDate: Date;
  keyForDay: string;
  selectedDate: string;
  todayKey: string;
  rows: CalendarDisplayRow[];
}
