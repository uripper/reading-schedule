import { FakeDocument, FakeElement } from "./fake-dom-core.mjs";

function windowEvent(type, props = {}) {
    return {
        currentTarget: props.currentTarget ?? null,
        defaultPrevented: false,
        preventDefault() {
            this.defaultPrevented = true;
        },
        target: props.target ?? null,
        type,
        ...props,
    };
}

const ELEMENT_GLOBALS = [
    "Element",
    "HTMLButtonElement",
    "HTMLDialogElement",
    "HTMLDivElement",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLSpanElement",
    "Node",
];
const VIEWPORT_DEFAULTS = { innerHeight: 900, innerWidth: 1440, scrollY: 0 };
const SWAPPED_GLOBALS = [
    ...ELEMENT_GLOBALS,
    ...Object.keys(VIEWPORT_DEFAULTS),
    "addEventListener",
    "document",
];

/** Captures every global the fake DOM replaces so it can be restored. */
function snapshotGlobals() {
    return Object.fromEntries(
        SWAPPED_GLOBALS.map((name) => [name, globalThis[name]]),
    );
}

/** Puts back the globals captured by `snapshotGlobals`. */
function restoreGlobals(originals) {
    for (const NAME of SWAPPED_GLOBALS) {
        globalThis[NAME] = originals[NAME];
    }
}

/** Records window listeners by event type instead of touching a real window. */
function windowListenerRecorder(windowHandlers) {
    return (type, handler) => {
        const HANDLERS = windowHandlers.get(type) ?? [];
        HANDLERS.push(handler);
        windowHandlers.set(type, HANDLERS);
    };
}

/** Points DOM constructors, document, viewport, and window listeners at fakes. */
function installGlobals(document, windowHandlers) {
    globalThis.document = document;
    for (const NAME of ELEMENT_GLOBALS) {
        globalThis[NAME] = FakeElement;
    }
    Object.assign(globalThis, VIEWPORT_DEFAULTS);
    globalThis.addEventListener = windowListenerRecorder(windowHandlers);
}

/** Builds the test-facing controls for an installed fake DOM. */
function fakeDomControls(document, windowHandlers, originals) {
    return {
        createElement(tagName, id = "") {
            const ELEMENT = document.createElement(tagName);
            if (id !== "") {
                ELEMENT.id = id;
            }
            return ELEMENT;
        },
        dispatchDocument(type, props = {}) {
            return document.dispatch(type, props);
        },
        dispatchWindow(type, props = {}) {
            const HANDLERS = windowHandlers.get(type) ?? [];
            const EVENT = windowEvent(type, props);
            for (const HANDLER of HANDLERS) {
                HANDLER(EVENT);
            }
            return EVENT;
        },
        document,
        restore() {
            restoreGlobals(originals);
        },
    };
}

export function installFakeDom() {
    const ORIGINALS = snapshotGlobals();
    const DOCUMENT = new FakeDocument();
    const WINDOW_HANDLERS = new Map();
    installGlobals(DOCUMENT, WINDOW_HANDLERS);
    return fakeDomControls(DOCUMENT, WINDOW_HANDLERS, ORIGINALS);
}
