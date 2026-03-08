# ISSUE-099: Add repository license and surface it in metadata

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `docs`, `legal`

Problem:

The repository does not currently include a `LICENSE` file. That leaves usage, redistribution, and contribution terms ambiguous.

Expected:

The project should declare an explicit license and surface it consistently in repository docs and package metadata where applicable.

Definition of done:

- Choose and add a root `LICENSE` file.
- Reflect the license in package metadata where relevant.
- Mention the license in `README.md`.
- Confirm the chosen license is compatible with bundled dependencies and intended distribution plans.

Context:

- `README.md`
- `package.json`
- `electron/package.json`
- `mobile/package.json`
- `pyproject.toml`

