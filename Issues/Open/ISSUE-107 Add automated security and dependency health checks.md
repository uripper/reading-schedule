# ISSUE-107: Add automated security and dependency health checks

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `security`, `ci`

Problem:

Current repository tooling does not provide reliable answers for several basic security concerns. There is no automated secret scanning, no automated CVE check for Node and Python dependencies, and no repository-wide inventory of external input boundaries or tests that user-facing errors avoid leaking internal details.

Expected:

Security-sensitive areas should have concrete verification paths, with automation where possible and explicit review guidance where not.

Definition of done:

- Add secret scanning for committed files and pull requests.
- Add dependency vulnerability scanning for Node and Python.
- Add an update policy or automation path for dependency freshness.
- Inventory external input boundaries and document the validation mechanism used at each boundary.
- Add regression coverage for user-facing error redaction where appropriate.

Context:

- `package.json`
- `pyproject.toml`
- `src/reading_plan/http_api.py`
- `electron/main/book_lookup/`
- `mobile/src/config/mobile_env.ts`
