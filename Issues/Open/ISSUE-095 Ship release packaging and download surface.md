# ISSUE-095: Ship release packaging and download surface

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `release`, `desktop`, `mobile`, `docs`

Problem:

The repository can be run from source, but it does not currently present a real public distribution surface. There is no desktop packaging workflow, no public-facing website that explains Bartleby and lets someone download the app, and no documented smoke-test path for running installed artifacts. That leaves the project without a clear way to evaluate, download, install, and verify released builds.

Expected:

Supported targets should have a documented release artifact, a public download website with current download links, and a basic verification path that proves the app works when installed from a release rather than from source.

Definition of done:

- Define the supported release artifact for each target.
- Add packaging scripts/config for the supported desktop release format.
- Design and publish a lightweight download website that explains what Bartleby is, which platforms are supported, and where to get the latest builds.
- Decide whether mobile and web are release targets, preview targets, or explicitly unsupported.
- Add release-install smoke-test steps to contributor or release docs.

Context:

- `README.md`
- `ROADMAP.md`
- `package.json`
- `electron/package.json`
- `mobile/package.json`
