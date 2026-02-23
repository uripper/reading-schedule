import test from "node:test";
import assert from "node:assert/strict";

import { submitRecommendationToShelf } from "../dist/renderer/recommendations/add_to_shelf.js";

test("submitRecommendationToShelf fills form values and submits once", () => {
  let submitCount = 0;
  const target = {
    form: {
      requestSubmit() {
        submitCount += 1;
      },
    },
    titleInput: { value: "" },
    authorInput: { value: "" },
    wordsInput: { value: "" },
  };

  submitRecommendationToShelf(target, {
    title: "Persuasion",
    author: "Jane Austen",
    wordsTotal: 86500,
  });

  assert.equal(target.titleInput.value, "Persuasion");
  assert.equal(target.authorInput.value, "Jane Austen");
  assert.equal(target.wordsInput.value, "86500");
  assert.equal(submitCount, 1);
});
