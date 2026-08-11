/**
 * Binds Today progress inputs to row-local draft and visual state.
 */
import { el } from "../../dom.ts";
import type { TodayCarouselActiveItem } from "./today_carousel_model.ts";
import type { TodayProgressDraft } from "./today_carousel_progress.ts";
import {
    boundedTodayProgressDraft,
    buildTodayProgressInputViewModel,
} from "./today_carousel_progress.ts";
import { progressDraft, setProgressDraft } from "./today_carousel_state.ts";
import { finalizedPercentDraftText } from "./today-progress-percent.ts";

const EMPTY_TEXT = "";
const PROGRESS_ENTRY_CLASS = "has-progress-entry";

/** Returns the row-local draft for the active session. */
function currentDraft(
    active: TodayCarouselActiveItem,
): TodayProgressDraft | null {
    return progressDraft(active.row.rowKey);
}

/** Reads the progress pair currently displayed in the DOM. */
function liveDraft(): TodayProgressDraft {
    return {
        pagesText: el<HTMLInputElement>("todayPagesInput").value,
        percentText: el<HTMLInputElement>("todayPercentInput").value,
    };
}

/** Returns whether either progress field contains a user draft. */
function hasProgressEntry(draft: TodayProgressDraft): boolean {
    return (
        draft.pagesText.trim() !== EMPTY_TEXT ||
        draft.percentText.trim() !== EMPTY_TEXT
    );
}

/** Applies the paired entered-value color state to the progress panel. */
function applyProgressEntryState(draft: TodayProgressDraft): void {
    el<HTMLElement>("todayProgressPanel").classList.toggle(
        PROGRESS_ENTRY_CLASS,
        hasProgressEntry(draft),
    );
}

/**
 * Update the Today carousel's progress input fields (pages and percent) from the provided active item.
 * @example
 * applyProgressInputViewModel(activeItem)
 * undefined
 * @param active - The active carousel item containing pagesRead, progressPercent, pagesTotal and draft state used to build the view model.
 * @returns No return value; updates DOM input elements directly.
 **/
function applyProgressInputViewModel(active: TodayCarouselActiveItem): void {
    const VIEW_MODEL = buildTodayProgressInputViewModel({
        currentPagesRead: active.pagesRead,
        currentPercent: active.progressPercent,
        draft: currentDraft(active),
        pagesTotal: active.pagesTotal,
    });
    const PAGES_INPUT = el<HTMLInputElement>("todayPagesInput");
    const PERCENT_INPUT = el<HTMLInputElement>("todayPercentInput");
    PAGES_INPUT.value = VIEW_MODEL.pagesText;
    PAGES_INPUT.placeholder = VIEW_MODEL.pagesPlaceholder;
    PERCENT_INPUT.value = VIEW_MODEL.percentText;
    PERCENT_INPUT.placeholder = VIEW_MODEL.percentPlaceholder;
    applyProgressEntryState({
        pagesText: VIEW_MODEL.pagesText,
        percentText: VIEW_MODEL.percentText,
    });
    if (VIEW_MODEL.pagesMax === EMPTY_TEXT) {
        PAGES_INPUT.removeAttribute("max");
        return;
    }
    PAGES_INPUT.max = VIEW_MODEL.pagesMax;
}

/** Bounds, stores, and redisplays the active row's live progress draft. */
function syncProgressDraft(active: TodayCarouselActiveItem): void {
    const DRAFT = boundedTodayProgressDraft({
        draft: liveDraft(),
        pagesTotal: active.pagesTotal,
    });
    setProgressDraft({
        ...DRAFT,
        rowKey: active.row.rowKey,
    });
    applyProgressInputViewModel(active);
}

/** Rounds the percentage draft when editing ends. */
function finalizePercentDraft(active: TodayCarouselActiveItem): void {
    const PERCENT_INPUT = el<HTMLInputElement>("todayPercentInput");
    PERCENT_INPUT.value = finalizedPercentDraftText(PERCENT_INPUT.value);
    syncProgressDraft(active);
}

/** Binds page and percentage editing for the active Today session. */
export function bindTodayProgressInputs(active: TodayCarouselActiveItem): void {
    const PAGES_INPUT = el<HTMLInputElement>("todayPagesInput");
    const PERCENT_INPUT = el<HTMLInputElement>("todayPercentInput");
    applyProgressInputViewModel(active);
    PAGES_INPUT.oninput = () => {
        syncProgressDraft(active);
    };
    PERCENT_INPUT.oninput = () => {
        syncProgressDraft(active);
    };
    PERCENT_INPUT.onblur = () => {
        finalizePercentDraft(active);
    };
}

/** Clears progress values, hints, bounds, and entered-value styling. */
export function resetTodayProgressInputs(): void {
    const PAGES_INPUT = el<HTMLInputElement>("todayPagesInput");
    const PERCENT_INPUT = el<HTMLInputElement>("todayPercentInput");
    PAGES_INPUT.value = EMPTY_TEXT;
    PAGES_INPUT.placeholder = EMPTY_TEXT;
    PAGES_INPUT.removeAttribute("max");
    PERCENT_INPUT.value = EMPTY_TEXT;
    PERCENT_INPUT.placeholder = EMPTY_TEXT;
    el<HTMLElement>("todayProgressPanel").classList.remove(
        PROGRESS_ENTRY_CLASS,
    );
}
