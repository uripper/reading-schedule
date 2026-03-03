import assert from "node:assert/strict";
import test from "node:test";

import { submitRecommendationToShelf } from "../dist/renderer/recommendations/add_to_shelf.js";

test("submitRecommendationToShelf fills form values and focuses shelf picker", () => {
    let focusCount = 0;
    const TARGET = {
        authorInput: { value: "" },
        shelfInput: {
            focus() {
                focusCount += 1;
            },
        },
        titleInput: { value: "" },
        wordsInput: { value: "" },
    };

    submitRecommendationToShelf(TARGET, {
        author: "Jane Austen",
        coverUrl: "",
        title: "Persuasion",
        wordsTotal: 86500,
    });

    assert.equal(TARGET.titleInput.value, "Persuasion");
    assert.equal(TARGET.authorInput.value, "Jane Austen");
    assert.equal(TARGET.wordsInput.value, "86500");
    assert.equal(focusCount, 1);
});
