import { qa } from "./dom.js";

export function activateTab(name) {
  qa(".tab").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.tab === name));
  qa(".panel").forEach((panel) => panel.classList.toggle("is-active", panel.id === `tab-${name}`));
}

export function bindTabs() {
  qa(".tab").forEach((btn) => {
    btn.onclick = () => activateTab(btn.dataset.tab);
  });
}
