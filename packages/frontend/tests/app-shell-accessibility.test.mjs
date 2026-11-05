import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const TAB_IDS = ["today", "books", "schedule", "stats", "settings"];

function readShell() {
    return readFileSync(new URL("../index.html", import.meta.url), "utf8");
}

function tabButtonMarkup(shell, tabId) {
    const MATCH = new RegExp(
        `<button\\s+id="tab-btn-${tabId}"[^>]*>`,
        "u",
    ).exec(shell);
    assert.ok(MATCH, `Missing tab button for ${tabId}.`);
    return MATCH[0];
}

test("primary tabs sit inside a tablist and each button is a tab", () => {
    const SHELL = readShell();
    assert.match(
        SHELL,
        /<nav class="tabs" role="tablist"[^>]*id="primaryTabs">/u,
    );
    for (const TAB_ID of TAB_IDS) {
        assert.match(tabButtonMarkup(SHELL, TAB_ID), /\srole="tab"\s/u);
    }
});

test("the header logo declares intrinsic dimensions to avoid layout shift", () => {
    assert.match(
        readShell(),
        /<img class="neo-brand-logo"[^>]*\swidth="\d+"\sheight="\d+"/u,
    );
});
