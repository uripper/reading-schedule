export type JsonPrimitive = string | number | boolean | null;

export type JsonArray = JsonValue[];

export interface JsonObject {
    [key: string]: JsonValue;
}

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export type NumericLike = string | number | null | undefined;

export type SessionSource = "timer" | "manual";

export interface Session {
    book_id: string;
    created_at: string;
    ended_at: string;
    id: string;
    minutes: number;
    notes: string;
    pages_read: number | null;
    source: SessionSource;
    started_at: string;
    title: string;
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
