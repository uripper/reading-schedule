import {
  bookByIdIndex,
  sessionsByBookIndex,
  sessionsByDayIndex,
  splitCompletionIndexes,
} from "./state_indexes.js";
import type {
  AppRuntimeState,
  AppStateMutation,
  ApplyAppStateMutation,
} from "../../types/types.js";

/**
 * Applies runtime-state mutation operations and keeps derived indexes synchronized.
 * @param state Mutable runtime state container.
 * @param mutation Typed mutation payload.
 */
export const applyAppStateMutation: ApplyAppStateMutation = (
  state: AppRuntimeState,
  mutation: AppStateMutation,
): void => {
  const mutableState = state;
  switch (mutation.type) {
    case "set_last_result": {
      mutableState.lastResult = mutation.lastResult;
      return;
    }
    case "set_schedule_completions": {
      mutableState.scheduleCompletions = { ...mutation.scheduleCompletions };
      const split = splitCompletionIndexes(mutableState.scheduleCompletions);
      mutableState.derived.completionBySessionKey = split.completionBySessionKey;
      mutableState.derived.completionByDayBookKey = split.completionByDayBookKey;
      return;
    }
    case "set_blocked_day_books": {
      mutableState.blockedDayBooks = { ...mutation.blockedDayBooks };
      return;
    }
    case "set_blocked_day_book": {
      const nextBlocked = { ...mutableState.blockedDayBooks };
      if (mutation.blocked) {
        nextBlocked[mutation.key] = true;
      } else {
        delete nextBlocked[mutation.key];
      }
      mutableState.blockedDayBooks = nextBlocked;
      return;
    }
    case "set_sessions": {
      mutableState.sessions = [...mutation.sessions];
      mutableState.derived.sessionsByDay = sessionsByDayIndex(mutableState.sessions);
      mutableState.derived.sessionsByBook = sessionsByBookIndex(
        mutableState.sessions,
      );
      return;
    }
    case "set_book_index": {
      mutableState.derived.bookById = bookByIdIndex(mutation.books);
    }
  }
};
