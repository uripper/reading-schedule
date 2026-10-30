/** Small DOM and status-text helpers shared by sync provider settings and review controls. */

/** Creates an element with safe text content. */
export function syncElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text = "",
): HTMLElementTagNameMap[K] {
    const NODE = document.createElement(tag);
    NODE.textContent = text;
    return NODE;
}

/** Creates a non-submitting action button. */
export function syncButton(
    text: string,
    action: () => void,
): HTMLButtonElement {
    const BUTTON = syncActionButton(text);
    BUTTON.addEventListener("click", action);
    return BUTTON;
}

/** Creates a button for controls whose runtime listeners are bound separately. */
export function syncActionButton(text: string): HTMLButtonElement {
    const BUTTON = syncElement("button", text);
    BUTTON.className = "btn";
    BUTTON.type = "button";
    return BUTTON;
}

/** Formats native and JavaScript errors for a named sync source without object coercion. */
export function syncErrorMessage(error: unknown, sourceLabel: string): string {
    if (error instanceof Error) {
        return `${sourceLabel} sync: ${error.message}`;
    }
    if (typeof error === "string") {
        return `${sourceLabel} sync: ${error}`;
    }
    return `${sourceLabel} sync failed. Retry, then check the source if it fails again.`;
}
