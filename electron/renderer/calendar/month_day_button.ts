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
	const hasFinishRow = args.rows.some((row) => {
		return row.finish === true;
	});
	const isMuted = args.date.getMonth() !== args.firstDate.getMonth();
	const isSelected = args.selectedDate === args.keyForDay;
	const isPast = Number(args.keyForDay) < Number(args.todayKey);
	const isToday = Number(args.keyForDay) === Number(args.todayKey);
	return {
		hasFinishRow,
		isMuted,
		isPast,
		isSelected,
		isToday,
	};
}

/**
 * Builds weekday header labels for calendar grid.
 * @returns Weekday header span elements.
 */
export function createWeekdayHeader(): HTMLSpanElement[] {
	return WEEKDAY_LABELS.map((label) => {
		const head = document.createElement("span");
		head.className = "calendar-weekday";
		head.textContent = label;
		return head;
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
	const dayButton = document.createElement("button");
	dayButton.type = "button";
	dayButton.className = "day";
	const flags = dayStyleFlags(args);
	if (flags.hasFinishRow) {
		dayButton.classList.add("has-finish");
	}
	if (flags.isMuted) {
		dayButton.classList.add("is-muted");
	}
	if (flags.isSelected) {
		dayButton.classList.add("is-selected");
	}
	if (flags.isPast) {
		dayButton.classList.add("is-past");
	}
	if (flags.isToday) {
		dayButton.classList.add("is-today");
		dayButton.setAttribute("aria-current", "date");
	}
	dayButton.dataset.calendarDay = args.keyForDay;
	dayButton.setAttribute("role", "gridcell");
	dayButton.setAttribute("aria-selected", "false");
	if (flags.isSelected) {
		dayButton.setAttribute("aria-selected", "true");
	}
	const dayDate = document.createElement("span");
	dayDate.className = "day-date";
	dayDate.textContent = String(args.date.getDate());
	dayButton.append(dayDate);
	appendDayButtonSummary(dayButton, args.rows);
	return dayButton;
}
