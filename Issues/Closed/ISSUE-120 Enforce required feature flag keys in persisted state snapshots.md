# ISSUE-120: Enforce required feature flag keys in persisted state snapshots

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `state`, `validation`, `mobile`

Problem:

The feature-flag validator in `src/reading_plan/state_validation.py` accepts snapshots where required keys are missing. `_is_feature_flags(...)` currently checks values with `value.get(key, False)`, so absent keys are treated as `False` and pass validation.

Expected:

Persisted state validation should require all keys listed in `REQUIRED_FEATURE_FLAGS` to exist and be boolean values.

Definition of done:

- Update `_is_feature_flags(...)` to require key presence (`key in value`) and bool values.
- Add tests proving validation fails when any required feature-flag key is missing.
- Add tests proving validation fails when any required feature-flag value is non-bool.
- Keep existing valid-state roundtrip tests passing.
- Document the strict feature-flag shape in state snapshot docs.

Context:

- `src/reading_plan/state_validation.py`
- `tests/test_http_api.py`
- `src/reading_plan/http_api.py`
