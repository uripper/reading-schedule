import type { BookFormRefs } from "../../types/types.js";
import { el } from "../dom.js";

/**
 * Resolves and returns strongly typed DOM references for the book dialog form.
 * @returns Book form references used by dialog state and event handlers.
 */
export function getBookFormRefs(): BookFormRefs {
    return {
        dialog: el<HTMLDialogElement>("bookDialog"),
        dialogTitle: el("bookDialogTitle"),
        form: el<HTMLFormElement>("bookForm"),
        bookId: el<HTMLInputElement>("bookFormId"),
        coverUrl: el<HTMLInputElement>("bookFormCoverUrl"),
        coverLocal: el<HTMLInputElement>("bookFormCoverLocal"),
        author: el<HTMLInputElement>("bookFormAuthor"),
        searchInput: el<HTMLInputElement>("bookSearchInput"),
        searchResults: el("bookSearchResults"),
        lookupMeta: el("bookLookupMeta"),
        coverPanel: el("bookCoverPanel"),
        coverUploadInput: el<HTMLInputElement>("bookCoverUploadInput"),
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
        afterBookResults: el("bookAfterBookResults"),
        blockedByInput: el<HTMLInputElement>("bookBlockedByInput"),
        statusSelectInput: el<HTMLSelectElement>("bookStatusSelectInput"),
        finishedAtField: el("bookFinishedAtField"),
        finishedAtInput: el<HTMLInputElement>("bookFinishedAtInput"),
        shelfSelectInput: el<HTMLSelectElement>("bookShelfSelectInput"),
        scheduledDaysField: el("bookScheduledDaysField"),
        applyScheduledDaysToShelfInput: el<HTMLInputElement>(
            "bookApplyScheduledDaysToShelfInput",
        ),
        shelfPromptDialog: el<HTMLDialogElement>("bookShelfPromptDialog"),
        shelfPromptForm: el<HTMLFormElement>("bookShelfPromptForm"),
        shelfPromptInput: el<HTMLInputElement>("bookShelfPromptInput"),
        coverPreview: el<HTMLImageElement>("bookCoverPreview"),
        saveBtn: el<HTMLButtonElement>("saveBookBtn"),
        cancelBtn: el<HTMLButtonElement>("cancelBookBtn"),
    };
}
