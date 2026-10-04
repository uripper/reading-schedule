/** Browser host behavior stays independent of native services. */

import assert from "node:assert/strict";
import test from "node:test";
import { createBrowserApi } from "../src/demo/browser-api.ts";
import { DemoStorage } from "../src/demo/storage.ts";

/** Creates a host whose storage rejects access, as in restricted browsing. */
function browserApi() {
    return createBrowserApi(
        new DemoStorage(() => {
            throw new Error("Browser storage denied");
        }),
    );
}

test("sample startup works without native services or available storage", async () => {
    const API = browserApi();
    assert.equal((await API.loadState()).source, "fresh");
    assert.ok((await API.sample()).books.length > 0);
    assert.equal(API.nativeZoom, false);
});

test("cover references survive browser edits without a native download", async () => {
    const API = browserApi();
    const URL = "https://covers.openlibrary.org/b/id/13136548-L.jpg";
    assert.equal(await API.downloadCover(URL, "sample-001"), URL);
    assert.equal(API.resolveCoverSrc(URL), URL);
});

test("native-only features fail with a download recovery path", async () => {
    const API = browserApi();
    await assert.rejects(API.searchBooks("Ulysses"), /Download Bartleby/);
    await assert.rejects(API.importAppData("{}"), /Download Bartleby/);
    await assert.rejects(API.exportAppData(), /Download Bartleby/);
    await assert.rejects(
        API.saveUploadedCover("data:image/png;base64,", "sample-001"),
        /Download Bartleby/,
    );
});
