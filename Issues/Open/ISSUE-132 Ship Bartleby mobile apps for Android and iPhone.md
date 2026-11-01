# ISSUE-132: Ship Bartleby mobile apps for Android and iPhone

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `mobile`

Problem:

Bartleby is only usable as a desktop app. Users cannot check today's reading or log progress from their phone.

Expected:

Bartleby has mobile apps for Android and iPhone that cover the core daily workflow.

Definition of done:

- Decide the mobile scope for a first release (for example Today, logging progress, and viewing the schedule).
- Build the Android and iPhone apps from the existing `mobile/` Expo project.
- Publish to the Google Play Store and Apple App Store.

Context:

- `mobile/` (existing Expo project with `dev:android` and `dev:ios` scripts)
- Related to ISSUE-016, multi-device sync, for sharing progress between desktop and mobile.
