# CleverTap Dashboard Setup & Operational Gotchas (Web Pop-up)

A custom HTML campaign does nothing on autopilot. These dashboard settings, if wrong,
make it misbehave silently. Always deliver code with the relevant notes from here.

## Required: use the Custom HTML template
Campaigns → Create → Web Pop-up → **Custom HTML**. Not the standard editor — that
won't accept arbitrary HTML.

## Recommended: avoid click double-counting
"Enable click tracking for Custom HTML" auto-raises `Notification Clicked` on every
`<button>`/`<a>` via `wzrk_c2a`. Confirm this flag's state with the user up front (see
`clarifying-questions.md`) rather than deciding it at delivery time:
- **ON** — the SDK auto-tracks every button/link; do NOT add `wzrk_c2a` manually anywhere,
  or clicks get double-counted.
- **OFF** — nothing is auto-tracked; add `wzrk_c2a` only to the specific CTA(s) the user
  confirmed they want tracked.

## Web Pop-up wrapper IDs (the close mechanism — no SDK method exists)
There is no documented `closePopup()` call. Closing means removing the wrapper element(s)
the SDK injected into the **parent** page, and the id is layout-specific — not a shared
mapping to try in sequence:
- Box → `wizParDiv0`
- Banner → `wizParDiv2` (not `wizParDiv1`)
- Interstitial → **two** elements, `intentOpacityDiv` (overlay) and `intentPreview`
  (wrapper) — a different id family, not `wizParDiv*` at all.

Get the layout right before writing the close script; the wrong id leaves the pop-up
stuck on screen. Full snippets in `references/web-popup.md`.

## Box size — 350 × 85 maximum
A Box's width and height are set in the dashboard, and the HTML is built to fit within a
**350px × 85px cap**. Tell the user to set the Box to 350 × 85 (or smaller). Anything
larger isn't supported by the build and may not render as designed. See
`references/web-popup.md` → "Box size cap".

## Dismiss spam control
Web SDK ≥ 2.0.0 defaults `dismissSpamControl` to `true` — meaning a campaign CAN reappear
in the same session even after the user closes it, as long as they keep qualifying. Set it
to `false` for the more intuitive "once shown and dismissed, don't show again this session"
behaviour. If the user wants finer control (once per day, no limit, etc.), point them to
the campaign's **Delivery Preferences** first — that's the primary lever, independent of
this flag.

## Assets & fonts
- HTTPS only (mixed content can be blocked by the browser).
- Keep a system-font fallback in case a webfont fails to load.
- Heavy images delay first paint; prefer SVG or small WebP/PNG.

## Delivery Preferences / spam control
Per-campaign Delivery Preferences control frequency (once per session/day/no limit) and
re-appearance after dismissal. If the user says "I only see it once," check this.

## Browser compatibility
`wzrk_c2a` click tracking is not supported on IE (no polyfill). Confirm target browsers if
the audience may include legacy IE users.
