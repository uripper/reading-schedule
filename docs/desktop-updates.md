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

Run the `Desktop Release` workflow from the private source repository on
`main`. It creates a draft release in the public repository with Windows and
macOS installers, signatures, and `latest.json`. Edit the release notes, verify
the assets, and publish the draft. Alpha-version releases must remain ordinary
GitHub releases rather than GitHub prereleases because the app reads
`releases/latest`.
