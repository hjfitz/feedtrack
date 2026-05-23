# Agent Guide For `components/`

## Scope
- Client panels and shared UI composition.
- `components/ui/` is generated-style shadcn/Radix infrastructure. Prefer using it over editing it.

## Patterns
- Page-level interactive panels are client components: `home-panel`, `history-panel`, `analytics-panel`, `settings-panel`.
- Use server actions directly from forms where possible.
- For destructive actions, use `components/ui/alert-dialog.tsx`.
- Use Lucide icons for buttons and controls when an icon exists.
- Keep controls dense and practical. This is a private operational tool, not a landing page.

## Dates And Times
- For display, use `formatAppDate`, `formatAppTime`, or `appDateKey` from `lib/timezone.ts`.
- For `datetime-local` values, use `formatAppDateTimeLocal`.
- Do not use browser-local timezone helpers unless the product explicitly changes away from the shared London timezone assumption.

## Styling
- Follow the existing Tailwind style: muted panels, small rounded controls, concise labels.
- Avoid nested cards. Use cards for repeated items, modals, and framed tools only.
- Make mobile layout the default concern; desktop should remain clean but does not need extra complexity.
