/** Small DOM helpers shared by Kobo settings and review controls. */

/** Creates an element with safe text content. */
export function koboElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text = "",
): HTMLElementTagNameMap[K] {
    const NODE = document.createElement(tag);
    NODE.textContent = text;
    return NODE;
}

/** Creates a non-submitting action button. */
export function koboButton(
    text: string,
    action: () => void,
): HTMLButtonElement {
    const BUTTON = koboActionButton(text);
    BUTTON.addEventListener("click", action);
    return BUTTON;
}

/** Creates a button for controls whose runtime listeners are bound separately. */
export function koboActionButton(text: string): HTMLButtonElement {
    const BUTTON = koboElement("button", text);
    BUTTON.className = "btn";
    BUTTON.type = "button";
    return BUTTON;
}
