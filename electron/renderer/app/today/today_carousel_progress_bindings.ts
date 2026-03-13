import { el } from "../../dom.js";
import type { TodayCarouselActiveItem } from "./today_carousel_model.js";
import {
    boundedTodayProgressDraft,
    buildTodayProgressInputViewModel,
    type TodayProgressDraft,
} from "./today_carousel_progress.js";
import { progressDraft, setProgressDraft } from "./today_carousel_state.js";

const EMPTY_TEXT = "";

function currentDraft(
    active: TodayCarouselActiveItem,
): TodayProgressDraft | null {
    return progressDraft(active.row.rowKey);
}

function liveDraft(): TodayProgressDraft {
    return {
        pagesText: el<HTMLInputElement>("todayPagesInput").value,
        percentText: el<HTMLInputElement>("todayPercentInput").value,
    };
}

/**
 * Update the Today carousel's progress input fields (pages and percent) from the provided active item.
 * @example
 * applyProgressInputViewModel(activeItem)
 * undefined
 * @param {{TodayCarouselActiveItem}} {{active}} - The active carousel item containing pagesRead, progressPercent, pagesTotal and draft state used to build the view model.
 * @returns {{void}} No return value; updates DOM input elements directly.
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
    if (VIEW_MODEL.pagesMax === EMPTY_TEXT) {
        PAGES_INPUT.removeAttribute("max");
        return;
    }
    PAGES_INPUT.max = VIEW_MODEL.pagesMax;
}

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
}

export function resetTodayProgressInputs(): void {
    const PAGES_INPUT = el<HTMLInputElement>("todayPagesInput");
    const PERCENT_INPUT = el<HTMLInputElement>("todayPercentInput");
    PAGES_INPUT.value = EMPTY_TEXT;
    PAGES_INPUT.placeholder = EMPTY_TEXT;
    PAGES_INPUT.removeAttribute("max");
    PERCENT_INPUT.value = EMPTY_TEXT;
    PERCENT_INPUT.placeholder = EMPTY_TEXT;
}
