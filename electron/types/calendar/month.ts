export interface CalendarRow {
  book_id?: string;
  date?: string;
  session_index?: string | number;
  title?: string;
  minutes?: number;
  finish?: boolean;
}

export interface CalendarState {
  dates: Record<string, CalendarRow[]>;
  months: string[];
  index: number;
  selectedDate: string;
  monthCellKeys: string[];
}

export interface MonthActions {
  completedBookRowsForDate(this: void, dateKey: string): CalendarRow[];
  moveSelectionBy(this: void, delta: number, currentIndex: number): void;
  renderDetails(this: void): void;
  selectDate(this: void, dateKey: string, options?: { focus?: boolean }): void;
}
