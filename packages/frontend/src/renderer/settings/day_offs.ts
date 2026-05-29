import { el } from "../dom.ts";
import { dayOffDatesFromInput } from "./day-off-dates.ts";

function dispatchDayOffChange(target: HTMLElement): void {
    target.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Renders day-off chips with remove actions.
 * @param dayOffs - Current day-off date keys.
 * @param setDayOffs - State setter for day-off updates.
 */
export function renderDayOffs(
    dayOffs: string[],
    setDayOffs: (nextDayOffs: string[]) => void,
): void {
    const LIST = el("dayOffList");
    const BUTTONS = dayOffs.map((day) => {
        const BUTTON = document.createElement("button");
        BUTTON.className = "chip-btn";
        BUTTON.type = "button";
        BUTTON.dataset.day = day;
        BUTTON.textContent = `${day} x`;
        BUTTON.onclick = () => {
            const NEXT = dayOffs.filter((value) => value !== day);
            setDayOffs(NEXT);
            dispatchDayOffChange(LIST);
        };
        return BUTTON;
    });
    LIST.replaceChildren(...BUTTONS);
}

function sortedUniqueDayOffs(dayOffs: string[]): string[] {
    const UNIQUE_DAY_OFFS = Array.from(new Set(dayOffs));
    UNIQUE_DAY_OFFS.sort((left, right) => left.localeCompare(right));
    return UNIQUE_DAY_OFFS;
}

/**
 * Binds the "add day off" button to append unique sorted date chips.
 * @param getDayOffs - Getter for current day-off values.
 * @param setDayOffs - State setter for day-off updates.
 */
export function bindDayOffAddButton(
    getDayOffs: () => string[],
    setDayOffs: (nextDayOffs: string[]) => void,
): void {
    el<HTMLButtonElement>("addDayOffBtn").onclick = () => {
        const DAY_OFF_INPUT = el<HTMLInputElement>("dayOffPicker");
        const SELECTED_DAYS = dayOffDatesFromInput(DAY_OFF_INPUT.value);
        const EXISTING = getDayOffs();
        if (SELECTED_DAYS.length === 0) {
            return;
        }
        setDayOffs(sortedUniqueDayOffs([...EXISTING, ...SELECTED_DAYS]));
        DAY_OFF_INPUT.value = "";
        dispatchDayOffChange(DAY_OFF_INPUT);
    };
}
