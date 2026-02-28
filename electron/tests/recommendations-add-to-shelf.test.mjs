import assert from "node:assert/strict";
import test from "node:test";

import { submitRecommendationToShelf } from "../dist/renderer/recommendations/add_to_shelf.js";

test("submitRecommendationToShelf fills form values and focuses shelf picker", () => {
    let focusCount = 0;
    const target = {
        authorInput: { value: "" },
        shelfInput: {
            focus() {
                focusCount += 1;
            },
        },
        titleInput: { value: "" },
        wordsInput: { value: "" },
    };

    submitRecommendationToShelf(target, {
        author: "Jane Austen",
        coverUrl: "",
        title: "Persuasion",
        wordsTotal: 86500,
    });

    assert.equal(target.titleInput.value, "Persuasion");
    assert.equal(target.authorInput.value, "Jane Austen");
    assert.equal(target.wordsInput.value, "86500");
    assert.equal(focusCount, 1);
});
