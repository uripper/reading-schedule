/** Renders the ending-page and percent selector with a single inline editor. */
import { bindSessionNumberEditor } from "./details_session_editor.ts";
import { metricValue } from "./details_session_metrics.ts";
import { parseOptionalNumber } from "./utils.ts";

type EndingUnit = "pages" | "percent";

export interface EndingMetricValues {
    pages: number | null;
    percent: number | null;
}

interface EndingMetricNodes {
    form: HTMLFormElement;
    input: HTMLInputElement;
    selector: HTMLSelectElement;
    value: HTMLElement;
}

type SaveEndingValue = (
    values: EndingMetricValues,
) => EndingMetricValues | null;

const PERCENT_MAX = 100;
const UNIT_LABELS: Record<EndingUnit, string> = {
    pages: "Ending Page",
    percent: "Ending %",
};

/** Builds the unit selector, defaulting to percent when only percent is known. */
function endingSelector(values: EndingMetricValues): HTMLSelectElement {
    const SELECTOR = document.createElement("select");
    SELECTOR.className = "day-session-metric-label day-ending-selector";
    SELECTOR.setAttribute("aria-label", "Ending progress unit");
    for (const [UNIT, LABEL] of Object.entries(UNIT_LABELS)) {
        const OPTION = document.createElement("option");
        OPTION.value = UNIT;
        OPTION.textContent = LABEL;
        SELECTOR.append(OPTION);
    }
    SELECTOR.value = "pages";
    if (values.pages === null && values.percent !== null) {
        SELECTOR.value = "percent";
    }
    return SELECTOR;
}

/** Reads the selected unit, with a page fallback for unexpected option values. */
function endingUnit(selector: HTMLSelectElement): EndingUnit {
    if (selector.value === "percent") {
        return "percent";
    }
    return "pages";
}

/** Updates the summary and numeric field together when the unit changes. */
function syncEndingValue(
    nodes: EndingMetricNodes,
    values: EndingMetricValues,
): void {
    const { input, selector, value } = nodes;
    const UNIT = endingUnit(selector);
    const NUMBER = values[UNIT];
    input.value = String(NUMBER ?? "");
    input.setAttribute("aria-label", UNIT_LABELS[UNIT]);
    input.step = "1";
    input.max = "";
    value.textContent = "—";
    if (NUMBER !== null) {
        value.textContent = String(NUMBER);
    }
    if (UNIT === "percent") {
        input.step = "0.1";
        input.max = String(PERCENT_MAX);
        if (NUMBER !== null) {
            value.textContent = `${NUMBER}%`;
        }
    }
}

/** Saves the selected unit so the book progress logic can reconcile the other. */
function saveEditedValue(
    nodes: EndingMetricNodes,
    save: SaveEndingValue,
): EndingMetricValues | null {
    const VALUE = parseOptionalNumber(nodes.input.value);
    if (VALUE === null) {
        return null;
    }
    if (endingUnit(nodes.selector) === "percent") {
        return save({ pages: null, percent: VALUE });
    }
    return save({ pages: VALUE, percent: null });
}

/** Keeps the selected unit and the last saved value in sync. */
function bindEndingEditor(
    nodes: EndingMetricNodes,
    initialValues: EndingMetricValues,
    save: SaveEndingValue,
): void {
    let values = initialValues;
    const RESET_INPUT = () => syncEndingValue(nodes, values);
    const CLOSE_EDITOR = bindSessionNumberEditor(nodes.form, {
        input: nodes.input,
        label: () => UNIT_LABELS[endingUnit(nodes.selector)].toLowerCase(),
        resetInput: RESET_INPUT,
        save: () => {
            const SAVED = saveEditedValue(nodes, save);
            if (SAVED === null) {
                return false;
            }
            values = SAVED;
            RESET_INPUT();
            return true;
        },
        value: nodes.value,
    });
    nodes.selector.onchange = () => {
        RESET_INPUT();
        CLOSE_EDITOR();
    };
}

/** Creates the number field that occupies the same cell as the summary value. */
function endingInput(): HTMLInputElement {
    const INPUT = document.createElement("input");
    INPUT.type = "number";
    INPUT.className = "day-session-input";
    INPUT.min = "0";
    INPUT.required = true;
    INPUT.hidden = true;
    return INPUT;
}

/** Shows the ending value and enables inline editing when a save callback is supplied. */
export function endingMetric(
    values: EndingMetricValues,
    save?: SaveEndingValue,
): HTMLElement {
    const FORM = document.createElement("form");
    FORM.className = "day-session-metric day-ending-metric";
    const SELECTOR = endingSelector(values);
    const VALUE = metricValue("");
    const INPUT = endingInput();
    FORM.append(SELECTOR, VALUE, INPUT);
    const NODES = {
        form: FORM,
        input: INPUT,
        selector: SELECTOR,
        value: VALUE,
    };
    syncEndingValue(NODES, values);
    SELECTOR.onchange = () => syncEndingValue(NODES, values);
    if (save !== undefined) {
        bindEndingEditor(NODES, values, save);
    }
    return FORM;
}
