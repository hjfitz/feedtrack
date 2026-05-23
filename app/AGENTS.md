# Agent Guide For `app/`

## Scope
- App Router pages, route handlers, and server actions.
- Keep route components mostly responsible for authentication, loading data, validating URL params, and passing serializable props into client panels.

## Server Actions
- Place form actions under `app/actions/`.
- All feed/nappy mutations should call `revalidatePath('/')` and `revalidatePath('/history')`; add `/analytics` if the page stops fetching fresh data dynamically.
- Parse `datetime-local` form values with `parseAppDateTimeLocal` or existing action helpers so values are interpreted in the app timezone.
- Return small form-state objects for recoverable form errors. Use redirects only after successful auth navigation.

## Route Handlers
- Use `requireHouseholdId()` from `lib/server/http.ts` for API auth.
- Use `parseJsonBody()` for JSON input and catch `AppError` to return user-safe error messages.
- Keep route handlers thin; put validation and persistence in `lib/server/tracker.ts`.

## Pages
- Use `requireSessionHouseholdId()` for authenticated pages.
- Keep browser-only state in client components under `components/`.
- Validate `searchParams` before passing them to client components.
