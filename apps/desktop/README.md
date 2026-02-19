# Desktop Shell (`apps/desktop`)

TypeScript Electron shell that loads the shared React client and bridges to the Python planner.

This package is a migration scaffold and is not yet feature-parity with the primary desktop runtime in `electron/`.

## Dev

```bash
npm run dev:desktop:shell
```

Set `CLIENT_DEV_URL` to load Vite dev server instead of static files.

Example:

```bash
CLIENT_DEV_URL=http://localhost:5173 npm run dev:desktop:shell
```
