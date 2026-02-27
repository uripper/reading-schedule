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

export type SessionInput = Omit<Partial<Session>, "pages_read" | "source"> & {
  endedAt?: string;
  startedAt?: string;
  pages_read?: number | string | null;
  source?: string;
};

export type DateInput = string | number | Date;

export interface SessionRecord {
  ended_at: DateInput;
  minutes?: number | string | null;
}
