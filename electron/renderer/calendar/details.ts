import type {
	CalendarDetailsState,
	DetailInteractionHandlers,
} from "../../types/types.js";
import { el } from "../dom.js";
import { buildManualSessionAddPanel, dayMode } from "./details_helpers.js";
import {
	emptyMessageForMode,
	rowNodeForMode,
	rowsForMode,
} from "./details_render_helpers.js";
import { dateHeading } from "./utils.js";

/**
 * Renders selected-day details list and manual-add panel for current mode.
 * @param state Calendar details render state.
 * @param interactionHandlers Detail interaction callbacks.
 * @param onRerenderRequested Optional rerender callback override.
 */
export function renderCalendarDetails(
	state: CalendarDetailsState,
	interactionHandlers: DetailInteractionHandlers,
	onRerenderRequested: (() => void) | null = null,
): void {
	const calendarState = state;
	const details = el("calendarDayDetails");
	const key = calendarState.selectedDate;
	let rows: CalendarDetailsState["dates"][string] = [];
	if (key in calendarState.dates) {
		rows = calendarState.dates[key];
	}

	const title = document.createElement("h2");
	title.textContent = "Selected Day";
	if (key) {
		title.textContent = dateHeading(key);
	}

	if (!key) {
		const hint = document.createElement("p");
		hint.className = "hint-text";
		hint.textContent = "Select a day in the schedule grid to view details.";
		details.replaceChildren(title, hint);
		calendarState.expectedFinishHighlightDate = "";
		return;
	}

	const mode = dayMode(key);
	const rerenderDetails = (): void => {
		if (onRerenderRequested !== null) {
			onRerenderRequested();
			return;
		}
		renderCalendarDetails(
			calendarState,
			interactionHandlers,
			onRerenderRequested,
		);
	};
	const rowsToRender = rowsForMode(rows, mode, interactionHandlers);
	let firstBookId = "";
	let firstMinutes: number | null = null;
	if (rowsToRender.length > 0) {
		const firstRow = rowsToRender[0];
		firstBookId = firstRow.book_id;
		firstMinutes = firstRow.minutes;
	}
	const manualAddPanel = buildManualSessionAddPanel({
		mode,
		interactionHandlers,
		rerenderDetails,
		dateKey: key,
		defaultBookId: firstBookId,
		defaultMinutes: firstMinutes ?? undefined,
	});
	if (!rowsToRender.length) {
		const empty = document.createElement("p");
		empty.className = "hint-text";
		empty.textContent = emptyMessageForMode(mode);
		details.replaceChildren(title, empty, manualAddPanel);
		calendarState.expectedFinishHighlightDate = "";
		return;
	}

	const list = document.createElement("div");
	list.className = "day-details-list";
	const animateFinishRows = calendarState.expectedFinishHighlightDate === key;

	rowsToRender.forEach((row) => {
		const node = rowNodeForMode({
			state: calendarState,
			mode,
			row,
			interactionHandlers,
			rerenderDetails,
		});
		if (animateFinishRows && row.finish) {
			node.classList.add("is-finish-pulse");
		}
		list.append(node);
	});

	details.replaceChildren(title, list, manualAddPanel);
	calendarState.expectedFinishHighlightDate = "";
}
