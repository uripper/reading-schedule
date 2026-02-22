import type { Book } from "./types.js";
import { getPlannerApi } from "../app/planner_api.js";

/**
 * Downloads remote cover art for a book when no local cover exists yet.
 * @param book Source book model.
 * @returns Original book or cloned book with `cover_local_path` populated.
 */
export async function hydrateBookCover(book: Book): Promise<Book> {
  if (!book.cover_url || book.cover_local_path) {
    return book;
  }

  try {
    const localCover = await getPlannerApi().downloadCover(
      book.cover_url,
      book.book_id,
    );
    if (localCover) {
      return { ...book, cover_local_path: localCover };
    }
    return book;
  } catch {
    return book;
  }
}

/**
 * Inserts or replaces a book in collection by `book_id`.
 * @param books Existing books collection.
 * @param nextBook Book to insert or replace.
 * @returns New books array with upsert applied.
 */
export function upsertBookById(books: Book[], nextBook: Book): Book[] {
  const index = books.findIndex((row) => row.book_id === nextBook.book_id);
  if (index < 0) {
    return [...books, nextBook];
  }
  const nextBooks = [...books];
  nextBooks[index] = nextBook;
  return nextBooks;
}
