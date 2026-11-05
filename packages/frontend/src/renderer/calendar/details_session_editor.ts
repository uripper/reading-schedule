/** Binds the pencil, number field, and save action for a Schedule metric. */

export interface SessionNumberEditor {
    input: HTMLInputElement;
    label: () => string;
    resetInput: () => void;
    save: () => boolean;
    value: HTMLElement;
}

/** Swaps the value and number field in place and updates the action label. */
function setEditing(
    editor: SessionNumberEditor,
    button: HTMLButtonElement,
    editing: boolean,
): void {
    const { input, value } = editor;
    const ACTION = button;
    input.hidden = !editing;
    value.hidden = editing;
    ACTION.type = "button";
    ACTION.classList.toggle("is-saving", editing);
    let label = `Edit ${editor.label()}`;
    if (editing) {
        ACTION.type = "submit";
        label = `Save ${editor.label()}`;
        input.focus();
        input.select();
    }
    ACTION.setAttribute("aria-label", label);
    ACTION.title = label;
}

/** Enter submits the field and Escape restores the last committed value. */
function bindEditorEvents(
    form: HTMLFormElement,
    editor: SessionNumberEditor,
    action: HTMLButtonElement,
): void {
    const FORM = form;
    const { input } = editor;
    input.onkeydown = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            editor.resetInput();
            setEditing(editor, action, false);
            action.focus();
        }
    };
    FORM.onsubmit = (event) => {
        event.preventDefault();
        if (!input.hidden && editor.save()) {
            setEditing(editor, action, false);
            action.focus();
        }
    };
}

/** Adds inline editing and returns a way to close it after changing units. */
export function bindSessionNumberEditor(
    form: HTMLFormElement,
    editor: SessionNumberEditor,
): () => void {
    const ACTION = document.createElement("button");
    ACTION.className = "btn btn-icon btn-quiet btn-session-edit";
    ACTION.onclick = (event) => {
        if (editor.input.hidden) {
            event.preventDefault();
            setEditing(editor, ACTION, true);
        }
    };
    form.append(ACTION);
    bindEditorEvents(form, editor, ACTION);
    setEditing(editor, ACTION, false);
    return () => setEditing(editor, ACTION, false);
}
