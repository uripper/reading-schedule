import type {
    CalendarControlsState,
    JumpToTodayFn,
    RenderFn,
} from "../../types/types.js";
import { el } from "../dom.js";
import { monthLabel } from "./utils.js";

/**
 * Renders month navigation controls and binds prev/next/today actions.
 * @param state Calendar controls state.
 * @param renderControls Callback to rerender controls after index changes.
 * @param renderMonth Callback to rerender visible month grid.
 * @param jumpToToday Callback that jumps state focus to today.
 */
export function renderCalendarControls(
    state: CalendarControlsState,
    renderControls: RenderFn,
    renderMonth: RenderFn,
    jumpToToday: JumpToTodayFn,
): void {
    const CALENDAR_STATE = state;
    const KEY = CALENDAR_STATE.months[CALENDAR_STATE.index] || "";
    const CONTROLS = el("calendarControls");
    const TITLE = document.createElement("strong");
    TITLE.textContent = monthLabel(KEY);

    if (!KEY) {
        CONTROLS.replaceChildren(TITLE);
        return;
    }

    const PREV = document.createElement("button");
    PREV.className = "btn";
    PREV.type = "button";
    PREV.textContent = "Prev";

    const TODAY = document.createElement("button");
    TODAY.className = "btn btn-calendar-today";
    TODAY.type = "button";
    TODAY.textContent = "Today";

    const NEXT = document.createElement("button");
    NEXT.className = "btn";
    NEXT.type = "button";
    NEXT.textContent = "Next";

    PREV.onclick = () => {
        CALENDAR_STATE.index = Math.max(0, CALENDAR_STATE.index - 1);
        renderControls();
        renderMonth();
    };

    NEXT.onclick = () => {
        CALENDAR_STATE.index = Math.min(
            CALENDAR_STATE.months.length - 1,
            CALENDAR_STATE.index + 1,
        );
        renderControls();
        renderMonth();
    };

    TODAY.onclick = () => {
        jumpToToday();
    };

    CONTROLS.replaceChildren(PREV, TODAY, TITLE, NEXT);
}
