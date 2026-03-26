import assert from "node:assert/strict";

class FakeClassList {
    constructor(owner) {
        this.owner = owner;
        this.names = new Set();
    }

    add(...names) {
        for (const NAME of names) {
            if (NAME !== "") {
                this.names.add(NAME);
            }
        }
        this.owner.syncClassName();
    }

    contains(name) {
        return this.names.has(name);
    }

    remove(...names) {
        for (const NAME of names) {
            this.names.delete(NAME);
        }
        this.owner.syncClassName();
    }

    syncFromString(value) {
        this.names = new Set(String(value).split(/\s+/).filter(Boolean));
    }

    toggle(name, force) {
        const SHOULD_ADD = force ?? !this.names.has(name);
        if (SHOULD_ADD) {
            this.names.add(name);
        } else {
            this.names.delete(name);
        }
        this.owner.syncClassName();
        return SHOULD_ADD;
    }
}

function matchesSelector(node, selector) {
    if (selector.startsWith(".")) {
        return node.classList.contains(selector.slice(1));
    }
    if (selector.startsWith("#")) {
        return node.id === selector.slice(1);
    }
    return node.tagName.toLowerCase() === selector.toLowerCase();
}

function eventPayload(type, props = {}) {
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

export class FakeElement {
    constructor(ownerDocument, tagName = "div") {
        this.ownerDocument = ownerDocument;
        this.tagName = String(tagName).toUpperCase();
        this.children = [];
        this.parentElement = null;
        this.attributes = new Map();
        this.classList = new FakeClassList(this);
        this.dataset = {};
        this.handlers = new Map();
        this.style = {};
        this._className = "";
        this._id = "";
        this.disabled = false;
        this.hidden = false;
        this.defaultValue = "";
        this.focusCalls = 0;
        this.offsetHeight = 320;
        this.offsetWidth = 280;
        this.onclick = null;
        this.placeholder = "";
        this.readOnly = false;
        this.rect = { bottom: 80, left: 24 };
        this.spellcheck = true;
        this.textContent = "";
        this.type = "";
        this.value = "";
    }

    set className(value) {
        this._className = String(value);
        this.classList.syncFromString(this._className);
    }

    get className() {
        return this._className;
    }

    set id(value) {
        this._id = String(value);
        this.ownerDocument.register(this);
    }

    get id() {
        return this._id;
    }

    addEventListener(type, handler) {
        const HANDLERS = this.handlers.get(type) ?? [];
        HANDLERS.push(handler);
        this.handlers.set(type, HANDLERS);
    }

    append(...nodes) {
        for (const NODE of nodes) {
            if (!(NODE instanceof FakeElement)) {
                continue;
            }
            if (NODE.parentElement !== null) {
                NODE.parentElement.children = NODE.parentElement.children.filter(
                    (child) => child !== NODE,
                );
            }
            NODE.parentElement = this;
            this.children.push(NODE);
            this.ownerDocument.register(NODE);
        }
    }

    click() {
        if (this.disabled) {
            return;
        }
        this.dispatch("click");
    }

    closest(selector) {
        let current = this;
        while (current !== null) {
            if (matchesSelector(current, selector)) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

    contains(node) {
        if (!(node instanceof FakeElement)) {
            return false;
        }
        if (node === this) {
            return true;
        }
        return this.children.some((child) => child.contains(node));
    }

    dispatch(type, props = {}) {
        const EVENT = eventPayload(type, {
            currentTarget: this,
            target: this,
            ...props,
        });
        const HANDLERS = this.handlers.get(type) ?? [];
        for (const HANDLER of HANDLERS) {
            HANDLER(EVENT);
        }
        this.onclick?.(EVENT);
        return EVENT;
    }

    dispatchEvent(event) {
        const HANDLERS = this.handlers.get(event.type) ?? [];
        for (const HANDLER of HANDLERS) {
            HANDLER(event);
        }
        return true;
    }

    focus() {
        this.focusCalls += 1;
    }

    getBoundingClientRect() {
        return { ...this.rect };
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] ?? null;
    }

    querySelectorAll(selector) {
        const MATCHES = [];
        for (const CHILD of this.children) {
            if (matchesSelector(CHILD, selector)) {
                MATCHES.push(CHILD);
            }
            MATCHES.push(...CHILD.querySelectorAll(selector));
        }
        return MATCHES;
    }

    replaceChildren(...nodes) {
        this.children = [];
        this.append(...nodes);
    }

    replaceWith(node) {
        assert.ok(this.parentElement);
        const SIBLINGS = this.parentElement.children;
        const INDEX = SIBLINGS.indexOf(this);
        assert.notEqual(INDEX, -1);
        node.parentElement = this.parentElement;
        SIBLINGS.splice(INDEX, 1, node);
        this.ownerDocument.register(node);
    }

    setAttribute(name, value) {
        if (name === "id") {
            this.id = String(value);
            return;
        }
        this.attributes.set(name, String(value));
    }

    syncClassName() {
        this._className = Array.from(this.classList.names).join(" ");
    }
}

export class FakeDocument {
    constructor() {
        this.body = new FakeElement(this, "body");
        this.handlers = new Map();
        this.nodesById = new Map();
    }

    addEventListener(type, handler) {
        const HANDLERS = this.handlers.get(type) ?? [];
        HANDLERS.push(handler);
        this.handlers.set(type, HANDLERS);
    }

    createElement(tagName) {
        return new FakeElement(this, tagName);
    }

    dispatch(type, props = {}) {
        const EVENT = eventPayload(type, props);
        const HANDLERS = this.handlers.get(type) ?? [];
        for (const HANDLER of HANDLERS) {
            HANDLER(EVENT);
        }
        return EVENT;
    }

    getElementById(id) {
        return this.nodesById.get(id) ?? null;
    }

    querySelector(selector) {
        return this.body.querySelector(selector);
    }

    register(node) {
        if (node.id !== "") {
            this.nodesById.set(node.id, node);
        }
        for (const CHILD of node.children) {
            this.register(CHILD);
        }
    }
}
