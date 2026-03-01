export type * from "./types_app.js";
export type * from "./types_books.js";
export type * from "./types_calendar.js";
export type * from "./types_core.js";
export type * from "./types_experience.js";
export type * from "./types_lookup.js";
export type * from "./types_main.js";
export type * from "./types_planner.js";
export type * from "./types_stats.js";

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type Maybe<T> = T | null | undefined;

export type NonEmptyArray<T> = [T, ...T[]];

export type ValueOf<T> = T[keyof T];

export type StringKeyed<T> = Record<string, T>;

export type DateLike = string | number | Date;

export type Identifier = string;
