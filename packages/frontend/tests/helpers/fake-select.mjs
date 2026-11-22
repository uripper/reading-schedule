/**
 * Gives a fake element real `<select>` value semantics: the value is the
 * selected option's, assigning an unknown value selects nothing, and a select
 * whose chosen option is gone falls back to its first option.
 */
function selectedOption(select, state) {
    if (state.selected !== null && select.children.includes(state.selected)) {
        return state.selected;
    }
    if (state.cleared) {
        return null;
    }
    return select.children[0] ?? null;
}

export function withSelectSemantics(select) {
    const STATE = { cleared: false, selected: null };
    Object.defineProperty(select, "value", {
        configurable: true,
        get() {
            return selectedOption(select, STATE)?.value ?? "";
        },
        set(next) {
            const MATCH = select.children.find(
                (option) => option.value === String(next),
            );
            STATE.selected = MATCH ?? null;
            STATE.cleared = MATCH === undefined;
        },
    });
    return select;
}
