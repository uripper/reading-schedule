import {
    type CalendarControlsState,
    type JumpToTodayFn,
    type RenderFn,
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
    const calendarState = state;
    const key = calendarState.months[calendarState.index] || "";
    const controls = el("calendarControls");
    const title = document.createElement("strong");
    title.textContent = monthLabel(key);

    if (!key) {
        controls.replaceChildren(title);
        return;
    }

    const prev = document.createElement("button");
    prev.className = "btn";
    prev.type = "button";
    prev.textContent = "Prev";

    const today = document.createElement("button");
    today.className = "btn btn-calendar-today";
    today.type = "button";
    today.textContent = "Today";

    const next = document.createElement("button");
    next.className = "btn";
    next.type = "button";
    next.textContent = "Next";

    prev.onclick = () => {
        calendarState.index = Math.max(0, calendarState.index - 1);
        renderControls();
        renderMonth();
    };

    next.onclick = () => {
        calendarState.index = Math.min(
            calendarState.months.length - 1,
            calendarState.index + 1,
        );
        renderControls();
        renderMonth();
    };

    today.onclick = () => {
        jumpToToday();
    };

    controls.replaceChildren(prev, today, title, next);
}
