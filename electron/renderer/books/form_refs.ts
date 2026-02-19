import { el } from "../dom.js";

export type BookFormRefs = {
  dialog: HTMLDialogElement;
  dialogTitle: HTMLElement;
  form: HTMLFormElement;
  bookId: HTMLInputElement;
  coverUrl: HTMLInputElement;
  coverLocal: HTMLInputElement;
  author: HTMLInputElement;
  searchInput: HTMLInputElement;
  searchResults: HTMLElement;
  lookupMeta: HTMLElement;
  titleInput: HTMLInputElement;
  wordsInput: HTMLInputElement;
  pagesTotalInput: HTMLInputElement;
  pagesReadInput: HTMLInputElement;
  progressInput: HTMLInputElement;
  priorityInput: HTMLInputElement;
  difficultyInput: HTMLInputElement;
  minBlocksInput: HTMLInputElement;
  maxMinutesInput: HTMLInputElement;
  deadlineInput: HTMLInputElement;
  afterBookInput: HTMLInputElement;
  afterBookResults: HTMLElement;
  blockedByInput: HTMLInputElement;
  statusSelectInput: HTMLSelectElement;
  finishedAtField: HTMLElement;
  finishedAtInput: HTMLInputElement;
  shelfSelectInput: HTMLSelectElement;
  shelfPromptDialog: HTMLDialogElement;
  shelfPromptForm: HTMLFormElement;
  shelfPromptInput: HTMLInputElement;
  coverPreview: HTMLImageElement;
  saveBtn: HTMLButtonElement;
  cancelBtn: HTMLButtonElement;
};

export function getBookFormRefs(): BookFormRefs {
  return {
    dialog: el<HTMLDialogElement>("bookDialog"),
    dialogTitle: el<HTMLElement>("bookDialogTitle"),
    form: el<HTMLFormElement>("bookForm"),
    bookId: el<HTMLInputElement>("bookFormId"),
    coverUrl: el<HTMLInputElement>("bookFormCoverUrl"),
    coverLocal: el<HTMLInputElement>("bookFormCoverLocal"),
    author: el<HTMLInputElement>("bookFormAuthor"),
    searchInput: el<HTMLInputElement>("bookSearchInput"),
    searchResults: el<HTMLElement>("bookSearchResults"),
    lookupMeta: el<HTMLElement>("bookLookupMeta"),
    titleInput: el<HTMLInputElement>("bookTitleInput"),
    wordsInput: el<HTMLInputElement>("bookWordsInput"),
    pagesTotalInput: el<HTMLInputElement>("bookPagesTotalInput"),
    pagesReadInput: el<HTMLInputElement>("bookPagesReadInput"),
    progressInput: el<HTMLInputElement>("bookProgressInput"),
    priorityInput: el<HTMLInputElement>("bookPriorityInput"),
    difficultyInput: el<HTMLInputElement>("bookDifficultyInput"),
    minBlocksInput: el<HTMLInputElement>("bookMinBlocksInput"),
    maxMinutesInput: el<HTMLInputElement>("bookMaxMinutesInput"),
    deadlineInput: el<HTMLInputElement>("bookDeadlineInput"),
    afterBookInput: el<HTMLInputElement>("bookAfterBookInput"),
    afterBookResults: el<HTMLElement>("bookAfterBookResults"),
    blockedByInput: el<HTMLInputElement>("bookBlockedByInput"),
    statusSelectInput: el<HTMLSelectElement>("bookStatusSelectInput"),
    finishedAtField: el<HTMLElement>("bookFinishedAtField"),
    finishedAtInput: el<HTMLInputElement>("bookFinishedAtInput"),
    shelfSelectInput: el<HTMLSelectElement>("bookShelfSelectInput"),
    shelfPromptDialog: el<HTMLDialogElement>("bookShelfPromptDialog"),
    shelfPromptForm: el<HTMLFormElement>("bookShelfPromptForm"),
    shelfPromptInput: el<HTMLInputElement>("bookShelfPromptInput"),
    coverPreview: el<HTMLImageElement>("bookCoverPreview"),
    saveBtn: el<HTMLButtonElement>("saveBookBtn"),
    cancelBtn: el<HTMLButtonElement>("cancelBookBtn"),
  };
}
