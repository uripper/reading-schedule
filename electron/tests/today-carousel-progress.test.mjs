import assert from "node:assert/strict";
import test from "node:test";

import { formatPagesTotalText } from "../dist/renderer/app/today/today_carousel_progress.js";

test("formatPagesTotalText renders known total", () => {
    assert.equal(formatPagesTotalText(328), "328");
});

test("formatPagesTotalText renders unknown total placeholder", () => {
    assert.equal(formatPagesTotalText(null), "--");
});
