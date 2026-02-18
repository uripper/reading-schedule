# Client App (`apps/client`)

React + TypeScript SPA shared across web, desktop shell, and mobile wrapper.

## Routes
- `/today`
- `/sessions`
- `/settings`
- `/books`
- `/schedule`

## Adapter Model
The app uses one `PlannerAdapter` interface from `@reading-schedule/contracts`.
- Desktop runtime: `window.plannerApi` (Electron preload)
- Web/mobile runtime: HTTP adapter against `services/planner-api`

## Run
```bash
pnpm --filter @reading-schedule/client dev
```
