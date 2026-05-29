# UI/UX Product Review

## Overall Read
The product direction is strong: fast logging, calm analytics, private household context, and enough edit/export support to recover from mistakes. The main risk now is not missing features, but letting optional details make the core half-asleep parent logging flow feel heavier.

## Highest-Value UX Improvements
- [done] Make Home logging more progressive. Notes and mess size are useful, but they should not compete with the main action. Optional details should be available without slowing common logs.
- [done] Add undo after logging. A short-lived toast with Undo helps tired parents recover from accidental taps without adding confirmation steps.
- [done] Add a "logged just now" edit shortcut. Parents often remember "this happened 20 minutes ago" immediately after tapping.
- [done] Improve timestamp ergonomics. Date/time inputs are accurate but fiddly on mobile; quick offsets like Now, -10m, -30m, and -1h help.
- [done] Make recent activity more central on mobile. A compact recent list on Home helps parents confirm whether something was already logged.
- [todo] Add stronger empty and low-data states, especially in Analytics, so new users know what to log before patterns appear.
- [todo] Better surface notes without visual clutter. Longer notes should not dominate History rows.

## Design Language Evaluation
Strengths:
- Calm dark UI works well for night use.
- Domain colors are memorable: feeds, nappies, and pumps have distinct accents.
- Large tap targets on Home are appropriate.
- Soft borders and cards feel gentle rather than clinical.
- Copy mostly avoids medical claims and stays reassuring.

Weaknesses:
- The palette is becoming busy across sky, cyan, amber, violet, blue, orange, emerald, and red.
- Many nested cards make pages feel visually dense.
- Controls vary by context: segmented buttons, icon buttons, links, cards-as-buttons, and raw inputs compete a bit.
- Mobile Home feels like a focused app; Analytics and History feel more like dashboards/forms.
- Optional details risk making fast logging look as complex as editing.

## Recommended Design Direction
Keep the brand language quiet, dark, soft, practical, and parent-first. Tighten it with:
- A simpler neutral surface system: page background, panel, raised control.
- One accent per domain, used consistently but less heavily in backgrounds.
- Fewer nested panels.
- More icon-supported repeated actions.
- Progressive disclosure for optional detail.

## Next Practical Pass
Run a "sleepy parent" pass on Home: [done]
- Undo toast after logging.
- Quick timestamp offsets.
- Recent activity confirmation.
- Optional detail disclosure.

## Deferred Passes
- [skipped] History/export pass: add a review-before-export screen with date range, included entry types, CSV preview, and cleaner note expansion in History. Deferred because export polish is less urgent than core daily-use improvements.
