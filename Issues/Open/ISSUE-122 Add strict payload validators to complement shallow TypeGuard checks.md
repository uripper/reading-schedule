# ISSUE-122: Add strict payload validators to complement shallow TypeGuard checks

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `validation`, `python`, `api`

Problem:

The helpers in `src/reading_plan/type_guards.py` are intentionally shallow boundary checks (object/list and key-type checks), but several call sites rely on names that can be interpreted as full schema validation. This can delay failures to deeper parser/build steps and make error origins less clear.

Expected:

Boundary validation semantics should be explicit and consistent: use shallow guards only for narrowing, and add strict validators where strong schema guarantees are required.

Definition of done:

- Audit call sites using `is_book_data_list(...)` and `is_settings_data(...)`.
- Introduce strict validator helpers (or equivalent parser-level checks) for required fields/value types.
- Rename or document shallow guards so intent is unambiguous.
- Add tests showing boundary errors are raised at the intended layer.
- Keep existing parsing behavior and public payload contracts backward-compatible where possible.

Context:

- `src/reading_plan/type_guards.py`
- `src/reading_plan/http_api.py`
- `src/reading_plan/input/reading_io.py`
- `src/reading_plan/input/builders_*.py`
