import type { Book } from '../books/types.js';
import type { CalendarRowWithFinish } from './data.js';

export type DayMode = 'past' | 'today' | 'future';

type CompletionPayload = {
  completed: boolean;
  row: CalendarRowWithFinish;
  sessionKey: string;
};

type ProgressPayload = {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
  row: CalendarRowWithFinish;
};

export type ManualSessionBook = {
  bookId: string;
  title: string;
};

export type ManualSessionAddPayload = {
  date: string;
  bookId: string;
  minutes: number;
  completed?: boolean;
};

export type DetailInteractionHandlers = {
  isSessionCompleted: (sessionKey: string) => boolean;
  onSessionCompletionChanged: (payload: CompletionPayload) => void;
  onSessionProgressUpdated: (payload: ProgressPayload) => Book | null;
  getBookById: (bookId: string) => Book | null;
  listSessionBooks: () => ManualSessionBook[];
  onManualSessionAdded: (payload: ManualSessionAddPayload) => boolean;
  onSessionRemoved: (payload: { row: CalendarRowWithFinish }) => boolean;
};

export type CalendarStateSubset = {
  rows: CalendarRowWithFinish[];
  totalsByBookId: Record<string, number>;
};
