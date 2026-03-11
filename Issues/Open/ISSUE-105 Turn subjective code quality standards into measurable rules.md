# ISSUE-105: Turn subjective code-quality standards into measurable rules

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `tooling`, `docs`

Problem:

Several important code-quality standards are still mostly subjective in this repository. Current tooling does not reliably measure self-documenting names, boolean-prefix naming, single-letter variable exceptions, TypeScript commented-out dead code, file and folder naming consistency, explicit return-type expectations outside current scopes, or consistency in async and error-handling patterns.

Expected:

Each standard should either have an automated rule or an explicit manual-review rubric so reviewers are not guessing what good looks like.

Definition of done:

- Inventory the subjective review standards that should become measurable.
- Add lint or audit rules where they are practical.
- Add a documented reviewer rubric for the items that remain judgment-based.
- Make the new measurable rules part of required validation.
- Keep false-positive rates low enough that the output remains actionable.

Context:

- `biome.json`
- `eslint.config.mjs`
- `scripts/style_audit.mjs`
- `STYLEGUIDE.md`
