// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers provider enablement, persisted settings, and cancelling the native picker. */
import assert from "node:assert/strict";
import test from "node:test";
import {
    DEFAULT_PREFERENCES,
    normalizePreferences,
} from "../dist/renderer/app/experience/model.js";
import {
    bindKoboConfiguration,
    saveKoboConfiguration,
} from "../dist/renderer/kobo/configuration.js";
import {
    createKoboSettings,
    koboSyncEnabled,
    renderKoboSettings,
} from "../dist/renderer/kobo/settings.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const DATABASE = "/reader/.kobo/KoboReader.sqlite";

function fixture(t) {
    const DOM = installFakeDom();
    t.after(() => {
        DOM.restore();
    });
    const CONTEXT = {
        persistDraft: async () => {
            await Promise.resolve();
            return true;
        },
        state: { preferences: { ...DEFAULT_PREFERENCES } },
    };
    const NODES = createKoboSettings(CONTEXT.state.preferences);
    return { context: CONTEXT, nodes: NODES };
}

test("Kobo checkbox reveals controls and disabling retains the chosen file", (t) => {
    const { context: CONTEXT, nodes: NODES } = fixture(t);
    assert.equal(NODES.panel.hidden, true);
    CONTEXT.state.preferences = {
        ...DEFAULT_PREFERENCES,
        koboDatabasePath: DATABASE,
        koboSyncEnabled: true,
    };
    renderKoboSettings(NODES, CONTEXT.state.preferences);
    assert.equal(NODES.enable.checked, true);
    assert.equal(NODES.panel.hidden, false);
    assert.equal(NODES.file.textContent, "KoboReader.sqlite");
    renderKoboSettings(NODES, {
        ...CONTEXT.state.preferences,
        koboSyncEnabled: false,
    });
    assert.equal(NODES.panel.hidden, true);
    assert.equal(NODES.file.title, DATABASE);
});

test("existing configured readers stay enabled; an explicit unchecked value wins", () => {
    assert.equal(koboSyncEnabled({ koboDatabasePath: DATABASE }), true);
    assert.equal(
        koboSyncEnabled({ koboDatabasePath: DATABASE, koboSyncEnabled: false }),
        false,
    );
    assert.equal(koboSyncEnabled({}), false);
    assert.equal(
        normalizePreferences({
            koboDatabasePath: DATABASE,
            koboSyncEnabled: false,
        }).koboSyncEnabled,
        false,
    );
});

test("failed settings saves restore enablement and the previous database", async (t) => {
    const { context: CONTEXT } = fixture(t);
    CONTEXT.state.preferences = {
        ...DEFAULT_PREFERENCES,
        koboDatabasePath: DATABASE,
        koboSyncEnabled: true,
    };
    CONTEXT.persistDraft = async () => {
        await Promise.resolve();
        throw new Error("disk full");
    };
    await assert.rejects(
        saveKoboConfiguration(CONTEXT, {
            koboDatabasePath: "/other.sqlite",
            koboSyncEnabled: false,
        }),
        /retry/,
    );
    assert.equal(CONTEXT.state.preferences.koboDatabasePath, DATABASE);
    assert.equal(CONTEXT.state.preferences.koboSyncEnabled, true);
});

test("cancelling Browse preserves the saved file and does not trigger another review", async (t) => {
    const { context: CONTEXT, nodes: NODES } = fixture(t);
    CONTEXT.state.preferences = {
        ...DEFAULT_PREFERENCES,
        koboDatabasePath: DATABASE,
        koboSyncEnabled: true,
    };
    let checks = 0;
    bindKoboConfiguration(CONTEXT, {
        monitor: {
            check: async () => {
                checks += 1;
                await Promise.resolve();
            },
        },
        nodes: NODES,
        pick: async () => {
            await Promise.resolve();
            return null;
        },
    });
    NODES.browse.click();
    await new Promise(setImmediate);
    assert.equal(CONTEXT.state.preferences.koboDatabasePath, DATABASE);
    assert.equal(checks, 0);
    assert.equal(NODES.enable.disabled, false);
});

test("choosing a file saves it automatically and starts a check", async (t) => {
    const { context: CONTEXT, nodes: NODES } = fixture(t);
    let checks = 0;
    bindKoboConfiguration(CONTEXT, {
        monitor: {
            check: async () => {
                checks += 1;
                await Promise.resolve();
            },
        },
        nodes: NODES,
        pick: async () => {
            await Promise.resolve();
            return DATABASE;
        },
    });
    NODES.browse.click();
    await new Promise(setImmediate);
    assert.equal(CONTEXT.state.preferences.koboDatabasePath, DATABASE);
    assert.equal(CONTEXT.state.preferences.koboSyncEnabled, true);
    assert.equal(NODES.panel.hidden, false);
    assert.equal(checks, 1);
});
