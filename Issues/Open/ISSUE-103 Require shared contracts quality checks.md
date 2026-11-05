# ISSUE-103: Require shared contracts quality checks

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `contracts`, `ci`

Problem:

Local CI runs shared contracts type checking and workspace-wide lint and formatting. The hosted desktop release checks cover contracts through the desktop build. Routine hosted PR validation for the shared package is still tracked by ISSUE-100.

Expected:

Shared contracts lint, formatting, and type checking run as required local and hosted checks.

Definition of done:

- Keep shared contracts lint, formatting, and type checking in required local validation.
- Add equivalent checks to hosted PR validation with ISSUE-100.

Context:

- `package.json`
- `packages/contracts/src/`

