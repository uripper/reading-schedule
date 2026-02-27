export interface FocusSession {
  bookId: string;
  date: string;
  minutes: number;
  sessionIndex: number | null;
  title: string;
}

export interface TodayFocusState {
  feedback: string;
  isOpen: boolean;
  isStarted: boolean;
  session: FocusSession | null;
}
