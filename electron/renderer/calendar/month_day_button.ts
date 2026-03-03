import type { DayStyleFlags, DayStyleFlagsArgs } from "../../types/types.js";
import { WEEKDAY_LABELS } from "./constants.js";
import { appendDayButtonSummary } from "./month_day_button_chips.js";

/**
 * Derives visual state flags for a calendar day button.
 * @param args Day-style input values for one calendar cell.
 * @param args.date Cell date.
 * @param args.firstDate First date of displayed month.
 * @param args.keyForDay Day key for the cell.
 * @param args.selectedDate Currently selected day key.
 * @param args.todayKey Today's day key.
 * @param args.rows Rows scheduled for the day.
 * @returns Day-style flags used for class/aria assignment.
 */
export function dayStyleFlags(args: DayStyleFlagsArgs): DayStyleFlags {
    const HAS_FINISH_ROW = args.rows.some((row) => {
        return row.finish === true;
    });
    const IS_MUTED = args.date.getMonth() !== args.firstDate.getMonth();
    const IS_SELECTED = args.selectedDate === args.keyForDay;
    const IS_PAST = Number(args.keyForDay) < Number(args.todayKey);
    const IS_TODAY = Number(args.keyForDay) === Number(args.todayKey);
    return {
        hasFinishRow: HAS_FINISH_ROW,
        isMuted: IS_MUTED,
        isPast: IS_PAST,
        isSelected: IS_SELECTED,
        isToday: IS_TODAY,
    };
}

/**
 * Builds weekday header labels for calendar grid.
 * @returns Weekday header span elements.
 */
export function createWeekdayHeader(): HTMLSpanElement[] {
    return WEEKDAY_LABELS.map((label) => {
        const HEAD = document.createElement("span");
        HEAD.className = "calendar-weekday";
        HEAD.textContent = label;
        return HEAD;
    });
}

/**
 * Creates one interactive day button with row summary chips and aria state.
 * @param args Day-button render input values.
 * @param args.date Cell date.
 * @param args.firstDate First date of displayed month.
 * @param args.keyForDay Day key for the cell.
 * @param args.rows Rows scheduled for the day.
 * @param args.selectedDate Currently selected day key.
 * @param args.todayKey Today's day key.
 * @returns Configured day button element.
 */
export function createDayButton(args: DayStyleFlagsArgs): HTMLButtonElement {
    const DAY_BUTTON = document.createElement("button");
    DAY_BUTTON.type = "button";
    DAY_BUTTON.className = "day";
    const FLAGS = dayStyleFlags(args);
    if (FLAGS.hasFinishRow) {
        DAY_BUTTON.classList.add("has-finish");
    }
    if (FLAGS.isMuted) {
        DAY_BUTTON.classList.add("is-muted");
    }
    if (FLAGS.isSelected) {
        DAY_BUTTON.classList.add("is-selected");
    }
    if (FLAGS.isPast) {
        DAY_BUTTON.classList.add("is-past");
    }
    if (FLAGS.isToday) {
        DAY_BUTTON.classList.add("is-today");
        DAY_BUTTON.setAttribute("aria-current", "date");
    }
    DAY_BUTTON.dataset.calendarDay = args.keyForDay;
    DAY_BUTTON.setAttribute("role", "gridcell");
    DAY_BUTTON.setAttribute("aria-selected", "false");
    if (FLAGS.isSelected) {
        DAY_BUTTON.setAttribute("aria-selected", "true");
    }
    const DAY_DATE = document.createElement("span");
    DAY_DATE.className = "day-date";
    DAY_DATE.textContent = String(args.date.getDate());
    DAY_BUTTON.append(DAY_DATE);
    appendDayButtonSummary(DAY_BUTTON, args.rows);
    return DAY_BUTTON;
}
