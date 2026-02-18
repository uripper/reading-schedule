# Mobile Wrapper (`apps/mobile`)

Capacitor project shell around `apps/client` build output.

## Sync web build into native projects
```bash
pnpm --filter @reading-schedule/mobile sync
```

Then open platform project:
```bash
pnpm --filter @reading-schedule/mobile open:ios
pnpm --filter @reading-schedule/mobile open:android
```
