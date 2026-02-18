// @ts-nocheck
import { el } from "../dom.js";

export function getBookFormRefs() {
  return {
    dialog: el("bookDialog"),
    dialogTitle: el("bookDialogTitle"),
    form: el("bookForm"),
    bookId: el("bookFormId"),
    coverUrl: el("bookFormCoverUrl"),
    coverLocal: el("bookFormCoverLocal"),
    author: el("bookFormAuthor"),
    searchInput: el("bookSearchInput"),
    searchResults: el("bookSearchResults"),
    lookupMeta: el("bookLookupMeta"),
    titleInput: el("bookTitleInput"),
    wordsInput: el("bookWordsInput"),
    pagesTotalInput: el("bookPagesTotalInput"),
    pagesReadInput: el("bookPagesReadInput"),
    progressInput: el("bookProgressInput"),
    priorityInput: el("bookPriorityInput"),
    difficultyInput: el("bookDifficultyInput"),
    minBlocksInput: el("bookMinBlocksInput"),
    maxMinutesInput: el("bookMaxMinutesInput"),
    deadlineInput: el("bookDeadlineInput"),
    afterBookInput: el("bookAfterBookInput"),
    afterBookResults: el("bookAfterBookResults"),
    blockedByInput: el("bookBlockedByInput"),
    shelfSelectInput: el("bookShelfSelectInput"),
    shelfNewWrap: el("bookShelfNewWrap"),
    shelfNewInput: el("bookShelfNewInput"),
    coverPreview: el("bookCoverPreview"),
    saveBtn: el("saveBookBtn"),
    cancelBtn: el("cancelBookBtn"),
  };
}
