import { type BookFormRefs } from "../../types/types.js";
import { el } from "../dom.js";

/**
 * Resolves and returns strongly typed DOM references for the book dialog form.
 * @returns Book form references used by dialog state and event handlers.
 */
export function getBookFormRefs(): BookFormRefs {
    return {
        afterBookInput: el<HTMLInputElement>("bookAfterBookInput"),
        afterBookResults: el("bookAfterBookResults"),
        applyScheduledDaysToShelfInput: el<HTMLInputElement>(
            "bookApplyScheduledDaysToShelfInput",
        ),
        author: el<HTMLInputElement>("bookFormAuthor"),
        blockedByInput: el<HTMLInputElement>("bookBlockedByInput"),
        bookId: el<HTMLInputElement>("bookFormId"),
        cancelBtn: el<HTMLButtonElement>("cancelBookBtn"),
        coverLocal: el<HTMLInputElement>("bookFormCoverLocal"),
        coverPanel: el("bookCoverPanel"),
        coverPreview: el<HTMLImageElement>("bookCoverPreview"),
        coverUploadInput: el<HTMLInputElement>("bookCoverUploadInput"),
        coverUrl: el<HTMLInputElement>("bookFormCoverUrl"),
        deadlineInput: el<HTMLInputElement>("bookDeadlineInput"),
        dialog: el<HTMLDialogElement>("bookDialog"),
        dialogTitle: el("bookDialogTitle"),
        difficultyInput: el<HTMLInputElement>("bookDifficultyInput"),
        finishedAtField: el("bookFinishedAtField"),
        finishedAtInput: el<HTMLInputElement>("bookFinishedAtInput"),
        form: el<HTMLFormElement>("bookForm"),
        lookupMeta: el("bookLookupMeta"),
        maxMinutesInput: el<HTMLInputElement>("bookMaxMinutesInput"),
        minBlocksInput: el<HTMLInputElement>("bookMinBlocksInput"),
        pagesReadInput: el<HTMLInputElement>("bookPagesReadInput"),
        pagesTotalInput: el<HTMLInputElement>("bookPagesTotalInput"),
        priorityInput: el<HTMLInputElement>("bookPriorityInput"),
        progressInput: el<HTMLInputElement>("bookProgressInput"),
        saveBtn: el<HTMLButtonElement>("saveBookBtn"),
        scheduledDaysField: el("bookScheduledDaysField"),
        searchInput: el<HTMLInputElement>("bookSearchInput"),
        searchResults: el("bookSearchResults"),
        shelfPromptDialog: el<HTMLDialogElement>("bookShelfPromptDialog"),
        shelfPromptForm: el<HTMLFormElement>("bookShelfPromptForm"),
        shelfPromptInput: el<HTMLInputElement>("bookShelfPromptInput"),
        shelfSelectInput: el<HTMLSelectElement>("bookShelfSelectInput"),
        statusSelectInput: el<HTMLSelectElement>("bookStatusSelectInput"),
        titleInput: el<HTMLInputElement>("bookTitleInput"),
        wordsInput: el<HTMLInputElement>("bookWordsInput"),
    };
}
