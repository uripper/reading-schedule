import type {
	CalendarRowWithFinish,
	DetailInteractionHandlers,
} from "../../types/types.js";
import { minutesFormForSession } from "./details_minutes_form.js";
import {
	baseSessionItem,
	COMPLETE_ITEM_CLASS,
	COMPLETE_TOGGLE_LABEL,
	DAY_DETAILS_META_CLASS,
	removeSessionButton,
} from "./details_session_shared.js";
import { sessionKeyFor } from "./utils.js";

const COMPLETED_TEXT = "Completed";
const NOT_COMPLETED_TEXT = "Not completed";

/**
 * Builds details row node for past sessions with completion toggle.
 * @param row Calendar row.
 * @param interactionHandlers Detail interaction handlers.
 * @param rerenderDetails Details rerender callback.
 * @returns Rendered row element.
 */
export function buildPastSessionItem(
	row: CalendarRowWithFinish,
	interactionHandlers: DetailInteractionHandlers,
	rerenderDetails: () => void,
): HTMLElement {
	const item = baseSessionItem(row);
	const sessionKey = sessionKeyFor(row);
	const completeLabel = document.createElement("label");
	completeLabel.className = "day-complete-toggle";
	const completeInput = document.createElement("input");
	completeInput.type = "checkbox";
	completeInput.checked = Boolean(
		interactionHandlers.isSessionCompleted(sessionKey),
	);
	completeLabel.append(completeInput, COMPLETE_TOGGLE_LABEL);
	const status = document.createElement("p");
	status.className = DAY_DETAILS_META_CLASS;
	if (completeInput.checked) {
		status.textContent = COMPLETED_TEXT;
	} else {
		status.textContent = NOT_COMPLETED_TEXT;
	}
	item.classList.toggle(COMPLETE_ITEM_CLASS, completeInput.checked);
	completeInput.onchange = () => {
		const checked = Boolean(completeInput.checked);
		item.classList.toggle(COMPLETE_ITEM_CLASS, checked);
		if (checked) {
			status.textContent = COMPLETED_TEXT;
		} else {
			status.textContent = NOT_COMPLETED_TEXT;
		}
		interactionHandlers.onSessionCompletionChanged({
			completed: checked,
			row,
			sessionKey,
		});
		rerenderDetails();
	};
	item.append(
		completeLabel,
		status,
		minutesFormForSession(row, interactionHandlers, rerenderDetails),
		removeSessionButton(row, interactionHandlers, rerenderDetails),
	);
	return item;
}
