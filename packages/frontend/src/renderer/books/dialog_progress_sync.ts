/** Keeps the book dialog's progress fields, unit selector, and meter in sync. */
import type { BookFormRefs } from "../../types/types.ts";
import { syncProgressAndPages } from "../book_lookup/helpers.ts";
import { el } from "../dom.ts";
import { syncFinishedAtField } from "./form-state.ts";

/** Switches the displayed field while preserving both input values. */
export function showBookProgressUnit(showPages: boolean): void {
    el("bookPagesReadField").hidden = !showPages;
    el("bookProgressPercentField").hidden = showPages;
    el("bookProgressPagesBtn").setAttribute("aria-pressed", String(showPages));
    el("bookProgressPercentBtn").setAttribute(
        "aria-pressed",
        String(!showPages),
    );
}

/** Updates the readout after user input or a programmatic form fill. */
export function renderBookDialogProgress(refs: BookFormRefs): void {
    const METER = el<HTMLProgressElement>("bookProgressMeter");
    const READOUT = el("bookProgressValue");
    const VALUE = refs.progressInput.value;
    METER.hidden = VALUE === "";
    METER.value = Number(VALUE);
    READOUT.textContent = "—";
    if (VALUE !== "") {
        READOUT.textContent = `${METER.value}%`;
    }
}

/** Starts in pages mode for page-based books and percent mode otherwise. */
export function resetBookDialogProgress(refs: BookFormRefs): void {
    showBookProgressUnit(Number(refs.pagesTotalInput.value) > 0);
    renderBookDialogProgress(refs);
}

/** Chooses the input that should stay fixed when the total changes. */
function totalChangeSource(refs: BookFormRefs): "pages" | "progress" {
    if (refs.form.classList.contains("is-bulk-book-form")) {
        return "pages";
    }
    if (el("bookProgressPercentBtn").getAttribute("aria-pressed") === "true") {
        return "progress";
    }
    return "pages";
}

/** Wires progress editing and status-dependent finish dates. */
export function bindBookDialogProgressSync(refs: BookFormRefs): void {
    refs.pagesTotalInput.addEventListener("input", () => {
        syncProgressAndPages(refs, totalChangeSource(refs));
        renderBookDialogProgress(refs);
    });
    refs.pagesReadInput.addEventListener("input", () => {
        syncProgressAndPages(refs, "pages");
        renderBookDialogProgress(refs);
    });
    refs.progressInput.addEventListener("input", () => {
        syncProgressAndPages(refs, "progress");
        renderBookDialogProgress(refs);
    });
    el("bookProgressPagesBtn").addEventListener("click", () => {
        showBookProgressUnit(true);
    });
    el("bookProgressPercentBtn").addEventListener("click", () => {
        showBookProgressUnit(false);
    });
    refs.statusSelectInput.addEventListener("change", () => {
        syncFinishedAtField(refs);
    });
}
