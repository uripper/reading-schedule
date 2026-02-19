import type { Book } from "./types.js";
import { getPlannerApi } from "../app/planner_api.js";

export async function hydrateBookCover(book: Book): Promise<Book> {
  if (!book.cover_url || book.cover_local_path) {
    return book;
  }

  try {
    const localCover = await getPlannerApi().downloadCover(book.cover_url, book.book_id);
    if (localCover) {
      return { ...book, cover_local_path: localCover };
    }
    return book;
  } catch {
    return book;
  }
}

export function upsertBookById(books: Book[], nextBook: Book): Book[] {
  const index = books.findIndex((row) => row.book_id === nextBook.book_id);
  if (index < 0) {
    return [...books, nextBook];
  }
  const nextBooks = [...books];
  nextBooks[index] = nextBook;
  return nextBooks;
}
