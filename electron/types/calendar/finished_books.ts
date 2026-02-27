export interface CompletedBookRow {
  book_id: string;
  date: string;
  finish: boolean;
  minutes: number;
  title: string;
}

export interface BookFinishLookup {
  finished_at: string | null;
  title: string;
}
