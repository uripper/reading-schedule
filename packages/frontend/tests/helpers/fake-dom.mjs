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

export function installFakeDom() {
    const ORIGINALS = {
        Element: globalThis.Element,
        HTMLButtonElement: globalThis.HTMLButtonElement,
        HTMLDialogElement: globalThis.HTMLDialogElement,
        HTMLDivElement: globalThis.HTMLDivElement,
        HTMLElement: globalThis.HTMLElement,
        HTMLInputElement: globalThis.HTMLInputElement,
        HTMLSpanElement: globalThis.HTMLSpanElement,
        Node: globalThis.Node,
        addEventListener: globalThis.addEventListener,
        document: globalThis.document,
        innerHeight: globalThis.innerHeight,
        innerWidth: globalThis.innerWidth,
        scrollY: globalThis.scrollY,
    };
    const DOCUMENT = new FakeDocument();
    const WINDOW_HANDLERS = new Map();
    globalThis.document = DOCUMENT;
    globalThis.HTMLElement = FakeElement;
    globalThis.HTMLInputElement = FakeElement;
    globalThis.HTMLButtonElement = FakeElement;
    globalThis.HTMLDialogElement = FakeElement;
    globalThis.HTMLDivElement = FakeElement;
    globalThis.HTMLSpanElement = FakeElement;
    globalThis.Element = FakeElement;
    globalThis.Node = FakeElement;
    globalThis.innerHeight = 900;
    globalThis.innerWidth = 1440;
    globalThis.scrollY = 0;
    globalThis.addEventListener = (type, handler) => {
        const HANDLERS = WINDOW_HANDLERS.get(type) ?? [];
        HANDLERS.push(handler);
        WINDOW_HANDLERS.set(type, HANDLERS);
    };
    return {
        createElement(tagName, id = "") {
            const ELEMENT = DOCUMENT.createElement(tagName);
            if (id !== "") {
                ELEMENT.id = id;
            }
            return ELEMENT;
        },
        document: DOCUMENT,
        dispatchDocument(type, props = {}) {
            return DOCUMENT.dispatch(type, props);
        },
        dispatchWindow(type, props = {}) {
            const HANDLERS = WINDOW_HANDLERS.get(type) ?? [];
            const EVENT = windowEvent(type, props);
            for (const HANDLER of HANDLERS) {
                HANDLER(EVENT);
            }
            return EVENT;
        },
        restore() {
            globalThis.document = ORIGINALS.document;
            globalThis.HTMLElement = ORIGINALS.HTMLElement;
            globalThis.HTMLInputElement = ORIGINALS.HTMLInputElement;
            globalThis.HTMLButtonElement = ORIGINALS.HTMLButtonElement;
            globalThis.HTMLDialogElement = ORIGINALS.HTMLDialogElement;
            globalThis.HTMLDivElement = ORIGINALS.HTMLDivElement;
            globalThis.HTMLSpanElement = ORIGINALS.HTMLSpanElement;
            globalThis.Element = ORIGINALS.Element;
            globalThis.Node = ORIGINALS.Node;
            globalThis.addEventListener = ORIGINALS.addEventListener;
            globalThis.innerHeight = ORIGINALS.innerHeight;
            globalThis.innerWidth = ORIGINALS.innerWidth;
            globalThis.scrollY = ORIGINALS.scrollY;
        },
    };
}
