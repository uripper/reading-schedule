# ISSUE-010: Add local-first CI command + pre-push enforcement

**Type:** tech-debt  
**Priority:** P1  
**Labels:** `tech-debt`, `devex`, `testing`

Problem:

Quality checks are run manually and are easy to skip by accident.

Expected:

One local command runs required checks, and pre-push enforces it by default.

Definition of done:

- Add `ci:local` script with required commands.
- Add hook setup and documented install step.
- Ensure fast failure and clear output.

Context:

- `package.json`
- `STYLEGUIDE.md`
