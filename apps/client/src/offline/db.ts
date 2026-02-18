import Dexie, { type Table } from "dexie";
import type { AppStateV2, Session } from "@reading-schedule/contracts";

export interface QueuedMutation {
  id?: number;
  kind: "save-state" | "log-session";
  payload: unknown;
  createdAt: string;
}

class ReadingScheduleDb extends Dexie {
  state!: Table<AppStateV2, number>;
  queue!: Table<QueuedMutation, number>;
  sessions!: Table<Session, string>;

  constructor() {
    super("reading-schedule-db");
    this.version(1).stores({
      state: "++id,updatedAt",
      queue: "++id,kind,createdAt",
      sessions: "id,book_id,ended_at",
    });
  }
}

export const db = new ReadingScheduleDb();
