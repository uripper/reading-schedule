# ISSUE-121: Reject nonstring planner names at API boundary

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `api`, `validation`, `consistency`

Problem:

`src/reading_plan/api.py` currently resolves planner names using `str(payload.get("planner", "mip"))`. This silently string-coerces non-string values (for example objects or numbers) instead of failing fast at the API boundary.

Expected:

Planner selection should be consistently type-validated across entrypoints, and non-string planner values should raise a clear `TypeError`.

Definition of done:

- Replace string coercion with explicit type validation in `src/reading_plan/api.py`.
- Align behavior with `src/reading_plan/http_api.py` planner validation.
- Add tests that reject non-string planner values with clear error messages.
- Keep valid planner-name behavior unchanged (default and explicit string names).
- Update docs to describe accepted planner field types.

Context:

- `src/reading_plan/api.py`
- `src/reading_plan/http_api.py`
- `tests/test_api.py`
