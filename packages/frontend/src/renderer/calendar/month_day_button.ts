import type { DayStyleFlags, DayStyleFlagsArgs } from "../../types/types.ts";
import { WEEKDAY_LABELS } from "./constants.ts";
import { appendDayButtonSummary } from "./month_day_button_chips.ts";

/**
 * Derives visual state flags for a calendar day button.
 * @param args - Day-style input values for one calendar cell.
 * @param date - Cell date.
 * @param firstDate - First date of displayed month.
 * @param keyForDay - Day key for the cell.
 * @param selectedDate - Currently selected day key.
 * @param todayKey - Today's day key.
 * @param rows - Rows scheduled for the day.
 * @returns Day-style flags used for class/aria assignment.
 */
export function dayStyleFlags(args: DayStyleFlagsArgs): DayStyleFlags {
    const HAS_FINISH_ROW = args.rows.some((row) => {
        return row.finish === true;
    });
    const IS_MUTED = args.date.getMonth() !== args.firstDate.getMonth();
    const IS_SELECTED = args.selectedDate === args.keyForDay;
    const IS_PAST = args.keyForDay < args.todayKey;
    const IS_TODAY = args.keyForDay === args.todayKey;
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

function ariaSelectedValue(selected: boolean): string {
    if (selected) {
        return "true";
    }
    return "false";
}

function applyDayFlagClasses(
    button: HTMLButtonElement,
    flags: DayStyleFlags,
): void {
    if (flags.hasFinishRow) {
        button.classList.add("has-finish");
    }
    if (flags.isMuted) {
        button.classList.add("is-muted");
    }
    if (flags.isSelected) {
        button.classList.add("is-selected");
    }
    if (flags.isPast) {
        button.classList.add("is-past");
    }
    if (!flags.isToday) {
        return;
    }
    button.classList.add("is-today");
    button.setAttribute("aria-current", "date");
}

/**
 * Creates one interactive day button with row summary chips and aria state.
 * @param args - Day-button render input values.
 * @param date - Cell date.
 * @param firstDate - First date of displayed month.
 * @param keyForDay - Day key for the cell.
 * @param rows - Rows scheduled for the day.
 * @param selectedDate - Currently selected day key.
 * @param todayKey - Today's day key.
 * @returns Configured day button element.
 */
export function createDayButton(args: DayStyleFlagsArgs): HTMLButtonElement {
    const DAY_BUTTON = document.createElement("button");
    DAY_BUTTON.type = "button";
    DAY_BUTTON.className = "day";
    const FLAGS = dayStyleFlags(args);
    applyDayFlagClasses(DAY_BUTTON, FLAGS);
    DAY_BUTTON.dataset.calendarDay = args.keyForDay;
    DAY_BUTTON.setAttribute("role", "gridcell");
    DAY_BUTTON.setAttribute(
        "aria-selected",
        ariaSelectedValue(FLAGS.isSelected),
    );
    const DAY_DATE = document.createElement("span");
    DAY_DATE.className = "day-date";
    DAY_DATE.textContent = String(args.date.getDate());
    DAY_BUTTON.append(DAY_DATE);
    appendDayButtonSummary(DAY_BUTTON, args.rows);
    return DAY_BUTTON;
}
