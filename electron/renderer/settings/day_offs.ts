import { el } from "../dom.js";

/**
 * Renders day-off chips with remove actions.
 * @param dayOffs Current day-off weekday keys.
 * @param setDayOffs State setter for day-off updates.
 */
export function renderDayOffs(
  dayOffs: string[],
  setDayOffs: (nextDayOffs: string[]) => void,
): void {
  const list = el("dayOffList");
  const buttons = dayOffs.map((day) => {
    const button = document.createElement("button");
    button.className = "chip-btn";
    button.type = "button";
    button.dataset.day = day;
    button.textContent = `${day} x`;
    button.onclick = () => {
      const next = dayOffs.filter((value) => value !== day);
      setDayOffs(next);
    };
    return button;
  });
  list.replaceChildren(...buttons);
}

/**
 * Binds the "add day off" button to append a unique sorted weekday chip.
 * @param getDayOffs Getter for current day-off values.
 * @param setDayOffs State setter for day-off updates.
 */
export function bindDayOffAddButton(
  getDayOffs: () => string[],
  setDayOffs: (nextDayOffs: string[]) => void,
): void {
  el<HTMLButtonElement>("addDayOffBtn").onclick = () => {
    const selectedDay = el<HTMLInputElement>("dayOffPicker").value;
    const existing = getDayOffs();
    if (!selectedDay || existing.includes(selectedDay)) {
      return;
    }
    const sorted = [...existing, selectedDay].sort((left, right) =>
      left.localeCompare(right),
    );
    setDayOffs(sorted);
  };
}
