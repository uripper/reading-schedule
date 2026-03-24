import { el } from "../dom.ts";

/**
 * Renders day-off chips with remove actions.
 * @param dayOffs - Current day-off weekday keys.
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
        };
        return BUTTON;
    });
    LIST.replaceChildren(...BUTTONS);
}

/**
 * Binds the "add day off" button to append a unique sorted weekday chip.
 * @param getDayOffs - Getter for current day-off values.
 * @param setDayOffs - State setter for day-off updates.
 */
export function bindDayOffAddButton(
    getDayOffs: () => string[],
    setDayOffs: (nextDayOffs: string[]) => void,
): void {
    el<HTMLButtonElement>("addDayOffBtn").onclick = () => {
        const SELECTED_DAY = el<HTMLInputElement>("dayOffPicker").value;
        const EXISTING = getDayOffs();
        if (!SELECTED_DAY || EXISTING.includes(SELECTED_DAY)) {
            return;
        }
        const SORTED = [...EXISTING, SELECTED_DAY].sort((left, right) =>
            left.localeCompare(right),
        );
        setDayOffs(SORTED);
    };
}
