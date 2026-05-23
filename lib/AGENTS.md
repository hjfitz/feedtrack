# Agent Guide For `lib/`

## Scope
- Shared domain types, storage adapters, timezone utilities, and non-UI helpers.

## Types
- `lib/types.ts` is the contract between server logic, API routes, and UI.
- Keep stored feed/nappy entries backward compatible. Hydrate stored timestamp strings to `Date` objects before returning them to app code.

## Timezone
- `lib/timezone.ts` is the single app timezone abstraction.
- The app currently assumes `Europe/London`.
- Use date keys from `appDateKey()` for grouping and `startOfAppDay()` for "today".
- Use `parseAppDateTimeLocal()` for timezone-less `datetime-local` values.

## Client Storage
- `lib/storage.ts` and hooks are legacy/client API helpers. Prefer the current server action and server loader path unless a feature is explicitly API/client driven.
