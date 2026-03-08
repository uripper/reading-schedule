# ISSUE-100: Add hosted CI CD workflows and required checks

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `ci`, `devex`

Problem:

The repository has a local `ci:local` command, but it does not currently have hosted CI or CD workflows under `.github/workflows`. Branch safety depends on local discipline alone, and there is no shared automation path for validating or releasing changes.

Expected:

Pull requests and pushes should run required validation in hosted CI, and supported release targets should have an explicit CD or release workflow.

Definition of done:

- Add hosted workflows for lint, typecheck, tests, and builds that match repository policy.
- Surface pass or fail status in pull requests.
- Mark core validation jobs as required checks.
- Add release automation for the supported targets or explicitly document why release automation is deferred.
- Keep workflow commands aligned with `STYLEGUIDE.md` and root scripts.

Context:

- `package.json`
- `README.md`
- `STYLEGUIDE.md`
