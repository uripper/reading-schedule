import { el } from "../dom.js";

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
