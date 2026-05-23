# Agent Guide For `lib/server/`

## Scope
- Server-only auth, persistence, and domain operations.

## Domain Logic
- `tracker.ts` owns validation and feed/nappy/user operations.
- Throw `AppError` for expected user-facing failures.
- Keep route handlers and server actions thin by calling functions from `tracker.ts`.

## Auth
- Sessions are JWT cookies managed in `auth.ts`.
- Passwords are hashed with `bcryptjs`; never store raw passwords.
- Account records are keyed by normalized username in blob storage.

## Storage
- `blob-storage.ts` hides Netlify Blob vs mock storage.
- Use `NEXT_PUBLIC_USE_MOCK_STORAGE=true` for local agent testing.
- Hydrate stored feed/nappy timestamps back to `Date` objects.
- Do not rename blob keys or change stored JSON shape without a migration/compatibility path.

## Summaries
- Summary date ranges should use app-timezone boundaries from `lib/timezone.ts`.
- `both` nappies count as wet and dirty for summary totals.
