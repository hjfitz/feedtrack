# Agent Guide

## Project Shape
- Next.js App Router app for a private baby tracker.
- Main user flows:
  - `/` logs feeds and nappies.
  - `/history` lists, edits, deletes, and exports entries.
  - `/analytics` aggregates recent feed and nappy activity.
  - `/settings` manages household invite, password, and logout.
- Data is stored through `lib/server/blob-storage.ts`, backed by Netlify Blobs unless `NEXT_PUBLIC_USE_MOCK_STORAGE=true`.

## Commands
- Type check: `npx tsc --noEmit`
- Build: `npm run build`
- Dev server with mock storage: `NEXT_PUBLIC_USE_MOCK_STORAGE=true JWT_SECRET=test-secret npm run dev`
- Build with mock env: `NEXT_PUBLIC_USE_MOCK_STORAGE=true JWT_SECRET=test-secret npm run build`
- Do not run `npm run lint` for routine verification. The current lint script is known to fail with `No files matching the pattern "." were found.` Only run it when changing the lint setup itself.

## Environment
- `JWT_SECRET` is required for auth/session code.
- Use mock storage for local development and tests unless explicitly checking Netlify Blob behavior.
- App-facing dates use `Europe/London`. Use `lib/timezone.ts` helpers instead of raw `toDateString`, `toLocaleDateString`, `toLocaleTimeString`, or server-local midnight calculations.

## Editing Rules
- Prefer server actions for form submissions from App Router client components.
- Revalidate all user-visible tracker pages when feed/nappy mutations change dashboard or history data.
- Keep timestamps as real `Date` instants at storage boundaries. Only parse/format app-local date/time at UI/API edges.
- Avoid broad file moves. The current grouping is intentional enough: pages in `app/`, client panels in `components/`, server domain logic in `lib/server/`, shared types/utilities in `lib/`.
- Preserve existing user data shape. If changing stored records, add compatibility handling for old entries.

## Important Files
- `lib/types.ts`: shared domain types.
- `lib/timezone.ts`: app timezone parsing, formatting, and date-key helpers.
- `lib/server/tracker.ts`: domain operations and validation.
- `lib/server/blob-storage.ts`: persistence and hydration.
- `app/actions/tracker.ts`: feed/nappy form actions.
- `app/actions/auth.ts`: auth/settings form actions.
- `components/home-panel.tsx`: logging UI.
- `components/history-panel.tsx`: edit/delete/history UI.
- `components/analytics-panel.tsx`: chart and summary UI.
