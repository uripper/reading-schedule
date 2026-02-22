import { el } from "../dom.js";
import { monthLabel } from "./utils.js";

interface CalendarControlsState {
  months: string[];
  index: number;
}

type RenderFn = () => void;
type JumpToTodayFn = () => void;

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
  const key = state.months[state.index] || "";
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
    state.index = Math.max(0, state.index - 1);
    renderControls();
    renderMonth();
  };

  next.onclick = () => {
    state.index = Math.min(state.months.length - 1, state.index + 1);
    renderControls();
    renderMonth();
  };

  today.onclick = () => {
    jumpToToday();
  };

  controls.replaceChildren(prev, today, title, next);
}
