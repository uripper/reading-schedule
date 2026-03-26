import type {
    CalendarControlsState,
    JumpToTodayFn,
    RenderFn,
} from "../../types/types.ts";
import { el } from "../dom.ts";
import { monthLabel } from "./utils.ts";

function controlButton(className: string, label: string): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.className = className;
    BUTTON.type = "button";
    BUTTON.textContent = label;
    return BUTTON;
}

function rerenderMonthView(
    renderControls: RenderFn,
    renderMonth: RenderFn,
): void {
    renderControls();
    renderMonth();
}

function shiftedIndex(state: CalendarControlsState, delta: number): number {
    return Math.min(state.months.length - 1, Math.max(0, state.index + delta));
}

/**
 * Renders month navigation controls and binds prev/next/today actions.
 * @param state - Calendar controls state.
 * @param renderControls - Callback to rerender controls after index changes.
 * @param renderMonth - Callback to rerender visible month grid.
 * @param jumpToToday - Callback that jumps state focus to today.
 */
export function renderCalendarControls(args: {
    jumpToToday: JumpToTodayFn;
    renderControls: RenderFn;
    renderMonth: RenderFn;
    state: CalendarControlsState;
}): void {
    const CALENDAR_STATE = args.state;
    const KEY = CALENDAR_STATE.months[CALENDAR_STATE.index] || "";
    const CONTROLS = el("calendarControls");
    const TITLE = document.createElement("strong");
    TITLE.textContent = monthLabel(KEY);

    if (!KEY) {
        CONTROLS.replaceChildren(TITLE);
        return;
    }

    const PREV = controlButton("btn", "Prev");
    const TODAY = controlButton("btn btn-calendar-today", "Today");
    const NEXT = controlButton("btn", "Next");

    PREV.onclick = () => {
        CALENDAR_STATE.index = shiftedIndex(CALENDAR_STATE, -1);
        rerenderMonthView(args.renderControls, args.renderMonth);
    };

    NEXT.onclick = () => {
        CALENDAR_STATE.index = shiftedIndex(CALENDAR_STATE, 1);
        rerenderMonthView(args.renderControls, args.renderMonth);
    };

    TODAY.onclick = () => {
        args.jumpToToday();
    };

    CONTROLS.replaceChildren(PREV, TODAY, TITLE, NEXT);
}
