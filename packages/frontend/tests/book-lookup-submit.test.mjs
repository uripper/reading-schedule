/** Exercises explicit lookup submission and invalidation through the bound controls. */
import assert from "node:assert/strict";
import test from "node:test";
import { bindBookLookup } from "../dist/renderer/book_lookup/search.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

/** Installs a planner bridge with manually resolved requests. */
function mockLookupRequests(t) {
    const ORIGINAL_PLANNER = globalThis.plannerApi;
    const REQUESTS = [];
    globalThis.plannerApi = {
        searchBooks(query) {
            const { promise, resolve } = Promise.withResolvers();
            REQUESTS.push({ query, resolve });
            return promise;
        },
    };
    t.after(() => {
        globalThis.plannerApi = ORIGINAL_PLANNER;
    });
    return REQUESTS;
}

/** Provides the attribute removal used by the combobox and busy state. */
function searchInput(dom) {
    const INPUT = dom.createElement("input");
    INPUT.removeAttribute = (name) => {
        INPUT.attributes.delete(name);
    };
    return INPUT;
}

/** Wires the search controls to the fake planner bridge. */
function setup(t) {
    const DOM = installFakeDom();
    t.after(() => {
        DOM.restore();
    });
    const REQUESTS = mockLookupRequests(t);
    const SEARCH_INPUT = searchInput(DOM);
    const SEARCH_BUTTON = DOM.createElement("button");
    SEARCH_BUTTON.append(DOM.createElement("span"));
    const RESULTS = DOM.createElement("datalist", "lookup-results");
    const META = DOM.createElement("p");
    const PICKED = [];
    bindBookLookup({
        metaEl: META,
        onPick(item) {
            PICKED.push(item);
        },
        resultsEl: RESULTS,
        searchButton: SEARCH_BUTTON,
        searchInput: SEARCH_INPUT,
    });
    return {
        dom: DOM,
        input: SEARCH_INPUT,
        meta: META,
        picked: PICKED,
        requests: REQUESTS,
        results: RESULTS,
        searchButton: SEARCH_BUTTON,
    };
}

/** Allows the adapter and rendering callbacks to settle. */
async function settle() {
    await new Promise((resolve) => {
        setImmediate(resolve);
    });
}

test("typing waits for Enter, and Enter selects a result without saving the book", async (t) => {
    const LOOKUP = setup(t);
    LOOKUP.input.value = "  Metaphysics  ";
    LOOKUP.input.dispatch("input");
    await settle();
    assert.equal(LOOKUP.requests.length, 0);
    const SEARCH = LOOKUP.input.dispatch("keydown", { key: "Enter" });
    assert.equal(SEARCH.defaultPrevented, true);
    await settle();
    assert.equal(LOOKUP.requests[0].query, "Metaphysics");
    LOOKUP.requests[0].resolve([{ title: "Metaphysics", author: "Aristotle" }]);
    await settle();
    const PICK = LOOKUP.input.dispatch("keydown", { key: "Enter" });
    assert.equal(PICK.defaultPrevented, true);
    assert.equal(LOOKUP.picked[0].author, "Aristotle");
    assert.equal(LOOKUP.requests.length, 1);
});

test("clicking the magnifier submits and changing the query discards late results", async (t) => {
    const LOOKUP = setup(t);
    LOOKUP.meta.dataset.lookupNote = "Custom cover uploaded.";
    LOOKUP.input.value = "Metaphysics";
    LOOKUP.searchButton.click();
    LOOKUP.dom.dispatchDocument("click", {
        target: LOOKUP.searchButton.children[0],
    });
    await settle();
    assert.equal(LOOKUP.meta.textContent, "Searching Open Library...");
    assert.equal(LOOKUP.requests[0].query, "Metaphysics");
    LOOKUP.input.value = "Poetics";
    LOOKUP.input.dispatch("input");
    LOOKUP.requests[0].resolve([{ title: "Metaphysics" }]);
    await settle();
    assert.equal(LOOKUP.results.children.length, 0);
    assert.equal(LOOKUP.requests.length, 1);
    assert.equal(LOOKUP.meta.textContent, "Custom cover uploaded.");
    assert.equal(LOOKUP.input.attributes.has("aria-busy"), false);
});

test("Enter during IME composition leaves the query untouched", async (t) => {
    const LOOKUP = setup(t);
    LOOKUP.input.value = "漢字";
    const COMPOSITION = LOOKUP.input.dispatch("keydown", {
        isComposing: true,
        key: "Enter",
    });
    await settle();
    assert.equal(COMPOSITION.defaultPrevented, false);
    assert.equal(LOOKUP.requests.length, 0);
});
