# Desktop Shell (`apps/desktop`)

TypeScript Electron shell that loads the shared React client and bridges to the Python planner.

## Dev
```bash
pnpm --filter @reading-schedule/desktop dev
```

Set `CLIENT_DEV_URL` to load Vite dev server instead of static files.

Example:
```bash
CLIENT_DEV_URL=http://localhost:5173 pnpm --filter @reading-schedule/desktop dev
```
