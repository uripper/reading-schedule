/**
 * Fake DOM for driving the real Library controller (`bindBooksUI`): every
 * element id the controller asks for is created on demand, so tests only
 * name the controls they interact with.
 */
import { FakeElement } from "./fake-dom-core.mjs";
import { installFakeDom } from "./fake-dom.mjs";

/** Marker `bindDateInput` uses to skip binding the flatpickr calendar. */
const DATE_INPUT_BOUND = "true";
const EXTRA_ELEMENT_GLOBALS = [
    "HTMLFormElement",
    "HTMLImageElement",
    "HTMLSelectElement",
];

function stubDialogApis(element) {
    const ELEMENT = element;
    ELEMENT.dataset.dateInputBound = DATE_INPUT_BOUND;
    ELEMENT.reset = () => undefined;
    ELEMENT.showModal = () => {
        ELEMENT.open = true;
    };
    Object.defineProperty(ELEMENT, "options", {
        get() {
            return ELEMENT.children;
        },
    });
}

function createOnDemand(dom) {
    const FIND = dom.document.getElementById.bind(dom.document);
    dom.document.getElementById = (id) => {
        const FOUND = FIND(id);
        if (FOUND !== null) {
            return FOUND;
        }
        const ELEMENT = dom.createElement("div", id);
        stubDialogApis(ELEMENT);
        dom.document.body.append(ELEMENT);
        return ELEMENT;
    };
}

/**
 * Installs the fake DOM with a `.books-toolbar` and on-demand elements.
 * @returns Fake DOM controls whose `restore` also removes the extra globals.
 */
export function installLibraryDom() {
    const ORIGINALS = Object.fromEntries(
        EXTRA_ELEMENT_GLOBALS.map((name) => [name, globalThis[name]]),
    );
    const DOM = installFakeDom();
    for (const NAME of EXTRA_ELEMENT_GLOBALS) {
        globalThis[NAME] = FakeElement;
    }
    createOnDemand(DOM);
    const TOOLBAR = DOM.createElement("div");
    TOOLBAR.className = "books-toolbar";
    DOM.document.body.append(TOOLBAR);
    return {
        ...DOM,
        restore() {
            Object.assign(globalThis, ORIGINALS);
            DOM.restore();
        },
    };
}
