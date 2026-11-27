/** Creates (once) the Library mass-edit buttons in the toolbar and the floating action. */

const ADD_VISIBLE_BUTTON_ID = "booksMassEditAddVisibleBtn";
const MASS_EDIT_BUTTON_ID = "booksMassEditBtn";
const FLOATING_BUTTON_ID = "booksMassEditFloatingBtn";
const INACTIVE_LABEL = "Mass Edit";

/** Returns the Mass Edit toolbar toggle, creating it on first use. */
export function ensureToolbarButton(toolbar: HTMLElement): HTMLButtonElement {
    const EXISTING = document.getElementById(MASS_EDIT_BUTTON_ID);
    if (EXISTING instanceof HTMLButtonElement) {
        return EXISTING;
    }
    const BUTTON = document.createElement("button");
    BUTTON.id = MASS_EDIT_BUTTON_ID;
    BUTTON.type = "button";
    BUTTON.className = "btn books-mass-edit-btn";
    BUTTON.textContent = INACTIVE_LABEL;
    toolbar.append(BUTTON);
    return BUTTON;
}

/** Returns the Add Visible toolbar button, creating it on first use. */
export function ensureAddVisibleButton(
    toolbar: HTMLElement,
): HTMLButtonElement {
    const EXISTING = document.getElementById(ADD_VISIBLE_BUTTON_ID);
    if (EXISTING instanceof HTMLButtonElement) {
        return EXISTING;
    }
    const BUTTON = document.createElement("button");
    BUTTON.id = ADD_VISIBLE_BUTTON_ID;
    BUTTON.type = "button";
    BUTTON.className = "btn btn-add-book books-mass-edit-add-btn";
    BUTTON.hidden = true;
    toolbar.append(BUTTON);
    return BUTTON;
}

/** Returns the floating Edit Books button, creating it on first use. */
export function ensureFloatingButton(): HTMLButtonElement {
    const EXISTING = document.getElementById(FLOATING_BUTTON_ID);
    if (EXISTING instanceof HTMLButtonElement) {
        return EXISTING;
    }
    const BUTTON = document.createElement("button");
    BUTTON.id = FLOATING_BUTTON_ID;
    BUTTON.type = "button";
    BUTTON.className = "btn btn-primary books-mass-edit-floating";
    BUTTON.hidden = true;
    document.body.append(BUTTON);
    return BUTTON;
}
