# ISSUE-095: Ship release packaging and download surface

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `release`, `desktop`, `mobile`, `docs`

Problem:

The repository can be run from source, but it does not currently present a real distribution surface. There is no desktop packaging workflow, no download website or equivalent release landing page, and no documented smoke-test path for running downloaded artifacts. That leaves the project without a clear way to download, install, and verify released builds.

Expected:

Supported targets should have a documented release artifact, a clear download path, and a basic verification path that proves the app works when installed from a release rather than from source.

Definition of done:

- Define the supported release artifact for each target.
- Add packaging scripts/config for the supported desktop release format.
- Decide whether mobile and web are release targets, preview targets, or explicitly unsupported.
- Publish a download surface such as a lightweight site or a GitHub Releases landing page.
- Add release-install smoke-test steps to contributor or release docs.

Context:

- `README.md`
- `package.json`
- `electron/package.json`
- `mobile/package.json`
