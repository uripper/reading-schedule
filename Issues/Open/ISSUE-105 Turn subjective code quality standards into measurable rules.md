# ISSUE-105: Turn subjective code-quality standards into measurable rules

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `tooling`, `docs`

Problem:

Biome already checks identifier casing, warns about filename conventions, and rejects floating/misused promises and several unsafe patterns. The style audit also checks documentation and other structural rules. Remaining judgment-based areas include semantic naming, boolean prefixes, single-letter exceptions, folder naming, commented-out code, explicit return-type scope, and contextual recovery in catch blocks. Inventory these gaps against the enabled commands rather than adding duplicate rules or treating an unused configuration as an enforced check.

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
