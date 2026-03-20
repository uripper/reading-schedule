import type { BookFormRefs } from "../../types/types.ts";
import { el } from "../dom.ts";

function dialogRefs() {
    return {
        cancelBtn: el<HTMLButtonElement>("cancelBookBtn"),
        dialog: el<HTMLDialogElement>("bookDialog"),
        dialogTitle: el("bookDialogTitle"),
        form: el<HTMLFormElement>("bookForm"),
        saveBtn: el<HTMLButtonElement>("saveBookBtn"),
    };
}

function identityRefs() {
    return {
        author: el<HTMLInputElement>("bookFormAuthor"),
        bookId: el<HTMLInputElement>("bookFormId"),
        coverUrl: el<HTMLInputElement>("bookFormCoverUrl"),
        difficultyInput: el<HTMLInputElement>("bookDifficultyInput"),
        lookupMeta: el("bookLookupMeta"),
        priorityInput: el<HTMLInputElement>("bookPriorityInput"),
        statusSelectInput: el<HTMLSelectElement>("bookStatusSelectInput"),
        titleInput: el<HTMLInputElement>("bookTitleInput"),
        wordsInput: el<HTMLInputElement>("bookWordsInput"),
    };
}

function coverRefs() {
    return {
        coverLocal: el<HTMLInputElement>("bookFormCoverLocal"),
        coverPanel: el("bookCoverPanel"),
        coverPreview: el<HTMLImageElement>("bookCoverPreview"),
        coverUploadInput: el<HTMLInputElement>("bookCoverUploadInput"),
    };
}

function scheduleRefs() {
    return {
        deadlineInput: el<HTMLInputElement>("bookDeadlineInput"),
        finishedAtField: el("bookFinishedAtField"),
        finishedAtInput: el<HTMLInputElement>("bookFinishedAtInput"),
        maxMinutesInput: el<HTMLInputElement>("bookMaxMinutesInput"),
        minBlocksInput: el<HTMLInputElement>("bookMinBlocksInput"),
        pagesReadInput: el<HTMLInputElement>("bookPagesReadInput"),
        pagesTotalInput: el<HTMLInputElement>("bookPagesTotalInput"),
        progressInput: el<HTMLInputElement>("bookProgressInput"),
        scheduledDaysField: el("bookScheduledDaysField"),
    };
}

function pickerRefs() {
    return {
        afterBookInput: el<HTMLInputElement>("bookAfterBookInput"),
        afterBookResults: el("bookAfterBookResults"),
        applyScheduledDaysToShelfInput: el<HTMLInputElement>(
            "bookApplyScheduledDaysToShelfInput",
        ),
        blockedByInput: el<HTMLInputElement>("bookBlockedByInput"),
        searchInput: el<HTMLInputElement>("bookSearchInput"),
        searchResults: el("bookSearchResults"),
        shelfPromptDialog: el<HTMLDialogElement>("bookShelfPromptDialog"),
        shelfPromptForm: el<HTMLFormElement>("bookShelfPromptForm"),
        shelfPromptInput: el<HTMLInputElement>("bookShelfPromptInput"),
        shelfSelectInput: el<HTMLSelectElement>("bookShelfSelectInput"),
    };
}

/**
 * Resolves and returns strongly typed DOM references for the book dialog form.
 * @returns Book form references used by dialog state and event handlers.
 */
export function getBookFormRefs(): BookFormRefs {
    return {
        ...pickerRefs(),
        ...identityRefs(),
        ...coverRefs(),
        ...scheduleRefs(),
        ...dialogRefs(),
    };
}
