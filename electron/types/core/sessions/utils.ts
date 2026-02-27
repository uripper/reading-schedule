export type DateInput = string | number | Date;

export interface SessionRecord {
  ended_at: DateInput;
  minutes?: number | string | null;
}
