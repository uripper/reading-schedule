/**
 * Regression test for Windows planner bundle arguments.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { plannerBundleArguments } from "../scripts/build_planner_bundle.mjs";

const COLLECT_ALL_FLAG = "--collect-all";
const HIDDEN_IMPORT_FLAG = "--hidden-import";
const ORTOOLS_PACKAGE_NAME = "ortools";
const GUI_API_MODULE = "reading_plan.gui_api";

test("planner bundle arguments collect OR-Tools resources", () => {
    const ARGS = plannerBundleArguments();
    const ORTOOLS_INDEX = ARGS.indexOf(COLLECT_ALL_FLAG);
    assert.notEqual(ORTOOLS_INDEX, -1);
    assert.equal(ARGS[ORTOOLS_INDEX + 1], ORTOOLS_PACKAGE_NAME);
});

test("planner bundle arguments pin the planner bridge module", () => {
    const ARGS = plannerBundleArguments();
    const GUI_IMPORT_INDEX = ARGS.indexOf(HIDDEN_IMPORT_FLAG);
    assert.notEqual(GUI_IMPORT_INDEX, -1);
    assert.equal(ARGS[GUI_IMPORT_INDEX + 1], GUI_API_MODULE);
});
