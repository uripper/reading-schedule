# Desktop updates

Bartleby checks the public `uripper/Bartleby` GitHub release feed after the
frontend finishes loading, every six hours while open, and when a backgrounded
app returns to the foreground after that interval. Dismissing an update hides
that version until the app is restarted. Development builds do not initialize
the native updater or contact the release feed.

Installation is always user-initiated. Before downloading, Bartleby cancels
the delayed save timer, waits for any active save, and writes the newest state
snapshot. A failed save stops the update instead of risking state loss.

## Startup schedule refresh

Bartleby restores books, settings, sessions, completions, and the saved
schedule before marking the renderer ready. It then queues an automatic plan
refresh. Automatic planning preserves today, past days, and recorded-session
history while replacing the future schedule, then persists the completed
result through the serialized save queue.

## Set the next version

Run this once from the repository root:

```sh
pnpm run version:set -- 0.1.4-alpha
pnpm run version:check
```

The command updates every package, application config, mobile config, and the
Rust crate version together. Use SemVer; `-alpha` can be removed for a stable
release.

## Release setup

The source repository needs these GitHub Actions secrets:

- `BARTLEBY_RELEASE_TOKEN`: a fine-grained token with Contents read/write
  access to the public `uripper/Bartleby` repository.
- `TAURI_SIGNING_PRIVATE_KEY`: the complete Tauri updater private key.

The public half of the same updater key is stored in
`apps/bartleby/src-tauri/tauri.conf.json`. The generated local private key is
`apps/bartleby/.tauri/bartleby.key`; that directory is gitignored, but it is
not a substitute for a secure backup. Installed clients cannot accept later
releases signed by a replacement key. This repository currently uses a
passwordless key, so no password secret is required.

`Desktop Release` is the only desktop build-and-release workflow. On a push to
`main`, GitHub starts it only when the root `package.json` changed. A small
gate compares the old and new canonical versions; an unrelated package edit
stops there, without starting Windows or macOS runners.

When the canonical version changed, the workflow validates the desktop app
once, builds each signed platform bundle once, and uploads the results to a
draft release in the public repository. A final job verifies that
`latest.json` contains Windows x64, macOS Apple Silicon, and macOS Intel
updates before publishing the release as `Latest`. Any failed validation,
build, or manifest check leaves the release unpublished. Website-only pushes
do not trigger the workflow.

Alpha-version releases remain ordinary GitHub releases rather than GitHub
prereleases because the app reads `releases/latest`.
