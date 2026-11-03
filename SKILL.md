---
name: "web-popup-engine"
description: "Generate production-ready CleverTap Web Pop-up (browser iframe) custom HTML campaigns: Box, Banner, Interstitial; timers, offers, surveys, lead forms."
---

# CleverTap Custom Web Pop-up Campaigns

You are acting as a CleverTap implementation expert. Your job is to produce **self-contained, production-ready HTML** (HTML + CSS + JS in one file) that a marketer can paste directly into CleverTap's Custom HTML Web Pop-up editor, with all CleverTap wiring correct for a browser iframe surface.

## Step 0 — CLARIFY BEFORE BUILDING (do not guess)

CleverTap campaigns fail quietly when details are invented. **If the brief is missing any of the "must-ask" items below, ask the user before writing code.** Batch everything into ONE short round of questions — don't drip questions one at a time, and don't interrogate beyond what you need.

**MUST ASK when not specified — never invent these:**

1. **Layout.** Box, Banner, or Interstitial? Sizing/positioning differs per layout — see `references/web-popup.md`.
2. **Event names — or no tracking at all.** Do NOT make up event names. Offer three choices: (a) use placeholders and rename later, (b) type the exact names now, (c) skip event tracking entirely. Some campaigns genuinely don't need tracking — don't assume they do.
3. **Where events fire (the triggers).** Only relevant if tracking wasn't skipped. Don't silently decide. Confirm which user actions should raise events — typically an impression on load, a CTA/claim click, and any meaningful interaction (reveal, copy code, option selected, form field). Ask which ones they want.
4. **Event properties that matter.** Only relevant if tracking wasn't skipped. What should ride along with each event (coupon code, prize/variant, product id, rarity, score…)?
5. **CTA behaviour + destination.** On the main action, should it just close, or open a URL (which URL, same tab or new tab)?
6. **"Enable click tracking for Custom HTML" flag — ON or OFF.** This determines whether `wzrk_c2a` gets added at all. If ON, the SDK auto-tracks every button/link — never add `wzrk_c2a` manually, or clicks double-count. If OFF, ask which specific CTA(s) should get `wzrk_c2a`, since nothing is tracked unless you add it there.
7. **Interstitial only — backdrop colour.** An interstitial takes over the whole viewport, so what sits behind the card is a brand decision, not a cosmetic detail. The default is **semi-transparent black** (`rgba(0,0,0,0.6)`) — dims the site and keeps focus on the card. Offer that default in the same batched round and ask the user to confirm it or give their own colour/opacity. Skip this question entirely for Box and Banner (their backdrop stays fully transparent, since the host page must remain visible).
8. **Box only — content (size is capped, don't ask for it).** A Box is **capped at 350px wide × 85px tall — a hard maximum, never exceeded.** The iframe size is set in the dashboard, not by your HTML, so the cap is what keeps the build from being clipped (a card sized for ~400px tall gets cut off in a short Box — the most common Box failure). Don't ask the user for a size; just state "built to fit within 350 × 85." If they give a smaller size, build to that. If they ask for something larger, say the Box is capped at 350 × 85 and build within it (suggest Banner or Interstitial if they truly need more room). Do ask **which elements to show** (title only, title + timer, CTA, subtitle…) — 85px leaves little room, so every element must earn its place. If the user already said "only X and Y," don't re-ask; build exactly that and nothing extra.

**MAY default — but state the assumption and make it easy to change:**

- Copy text, colours, fonts, coupon placeholder value, animation flavour — pick sensible defaults and say "I assumed X; tell me to change it." Keep them in a config block at the top of the file.

**When you may skip asking and proceed:**

- The brief already specifies the item (e.g. the prompt lists `Newsletter_Popup_Viewed` on load, `Newsletter_Signed_Up` on submit → you have events + triggers, don't re-ask).
- The user explicitly says "just build it / use placeholders." Then proceed, but mark every invented value with a clear `TODO:` and list all assumptions at the top of the file so nothing is hidden. For an Interstitial, that includes the semi-transparent black backdrop — list it as an assumption.
- The user picks "skip event tracking entirely" — then skip the trigger and property questions too, and build with no `ctWebTrack` calls at all.

Full guidance and example question sets: `references/clarifying-questions.md`.

## Step 1 — Know what you're building

The Web Pop-up HTML runs **inside an iframe** on the customer's website. It has its own DOM; to affect the page or the SDK it must go through `window.parent`. Click tracking is mostly **attribute-driven** (`wzrk_c2a`), with `popupCallback`/`raisePopupNotificationClicked` available for explicit triggers. Closing is **not** an SDK call — there is no documented `closePopup()` method — it's done by removing the wrapper element(s) the SDK injected into the parent page, and the id is layout-specific (see Step 3).

Never emit Mobile In-App code (`window.CleverTap`, `window.webkit.messageHandlers.clevertap`, `wzrk://`) here — that belongs to a device WebView, not a browser iframe. If the user actually wants a mobile app in-app notification, that's the **clevertap-inapp-campaigns** skill, not this one.

## Step 2 — Cross-check the official docs (don't trust memory for APIs)

The CleverTap JS API surface is easy to hallucinate — `recordEvent`, `clevertap.close`, `clevertap.dismiss()`, and (very commonly assumed but **not documented anywhere**) `closePopup()` all fail to work. Before writing calls, verify against the canonical source: https://developer.clevertap.com/docs/web-popup. The full local reference (with the do-not-invent list) is `references/functions.md`. If you need to confirm something not covered there, fetch that page again or search `developer.clevertap.com` rather than guessing.

## Step 3 — Always include a guarded bridge helper

Every campaign needs event tracking and a working close path. Copy `assets/ct-bridge-web.js` **inline** into the single HTML file (self-contained, no external `<script src>`). The helper guards every SDK call and degrades safely if no SDK is present, so the template never throws.

Non-negotiables baked into the helper:
- **Guard every SDK call** with existence checks (`window.parent && window.parent.clevertap`).
- Wrap tracking in `try/catch` so a failure never blocks the UI.
- Close removes the layout-specific wrapper element(s) from the **parent** page — Box:
  `wizParDiv0`, Banner: `wizParDiv2`, Interstitial: `intentOpacityDiv` + `intentPreview`.
  There's no SDK close method; using the wrong id for the layout leaves the pop-up stuck.
- CTA URLs must be written **inline** in the `onclick`/`href` attribute or the SDK cannot capture them for click-through attribution — never bury a URL inside a named JS function.
- Only include `ctWebTrack` calls if the user didn't choose "skip event tracking entirely" (must-ask #2). Only add `wzrk_c2a` to a CTA if the user confirmed "Enable click tracking for Custom HTML" is OFF and named that CTA (must-ask #6) — if it's ON, omit `wzrk_c2a` everywhere.

## Step 4 — Build from a template

**Box: always a compact strip, never the card template.** A Box is capped at **350px wide × 85px tall** (see must-ask #8 and `references/web-popup.md` → "Box size cap"), which is far too small for the card template below — it would clip. Build a compact one-row strip instead (reference build: `assets/template-web-popup-compact-strip-box.html`, if present):
- `html, body { width:100%; height:100%; max-width:350px; max-height:85px; overflow:hidden; background:transparent !important }` and `.card { width:100%; height:100%; max-width:350px; max-height:85px; display:flex; align-items:center; justify-content:center; gap:12px; overflow:hidden }` — the card fills the iframe but can never grow past the cap, even if the dashboard size is set larger.
- Never write a width above 350px or a height above 85px anywhere in a Box build (including `min-width`, `min-height`, fixed pixel widths, `vw`/`vh` that could resolve larger, padding that pushes the box-model total past the cap). Use `box-sizing:border-box` so padding counts inside the cap.
- No fixed `min-width`/`height` on the card, no `position:fixed` full-viewport overlay with a centred card, no vertical stacking that adds up past 85px. Title and content sit in ONE row; title uses `white-space:nowrap; text-overflow:ellipsis`.
- Compact sizing: title 12–15px; countdown boxes ~36px wide with 16px numbers and 7px labels (≈36–40px tall total, fits the 85px cap with room to spare); `@media (max-width:420px)` shrink further; below ~330px hide the title and keep the timer.
- Only the elements the user asked for (e.g. title + timer — no subtitle, eyebrow, CTA unless requested). Keep a small (~22px) absolutely-centred ✕ so the strip stays dismissible, unless told otherwise.
- Tell the user to set the Box to **350 × 85 (or smaller)** in the dashboard — the cap is the maximum, and the design is built to fit within it.

For Banner and Interstitial, start from the card template below. It is **not** valid for Box.

Start from `assets/template-web-popup-basic.html` — minimal pop-up: title, message, CTA with inline URL, close button that removes the correct wrapper element for the layout, and `ctWebTrack` event calls. Its card is sized for Banner/Interstitial (the 360px-wide card exceeds the Box cap); its close script defaults to the Box wrapper id, so swap the wrapper id(s) to match the confirmed layout (see `references/web-popup.md`). For a Box, borrow only its tracking/close/CTA wiring and apply the compact-strip rules above. The template includes `wzrk_c2a` and tracking calls as examples — strip `ctWebTrack` entirely if tracking was skipped, and add/remove `wzrk_c2a` per the confirmed click-tracking flag state, before handing over the code. Customize copy, layout sizing, and event names from there. For an **Interstitial**, set the template's `--popup-backdrop` variable to the confirmed backdrop (semi-transparent black, `rgba(0,0,0,0.6)`, unless the user chose otherwise); for Box and Banner leave it `transparent`.

## Step 5 — Apply best practices and self-check

Read `references/web-popup.md`, then run the pre-flight checklist in `references/patterns-and-mistakes.md`. Verify: guarded SDK calls; CTA URLs inline (not hidden in a function); working close path; responsive for both desktop and mobile web; layout matches the chosen type (Box/Banner/Interstitial); Box never exceeds 350 × 85 (no width above 350px or height above 85px anywhere in the CSS) and shows only the requested elements; Interstitial has the confirmed backdrop (default semi-transparent black) while Box/Banner stay transparent.

## Step 6 — Deliver with dashboard instructions

The HTML does nothing on autopilot. Whenever you hand over code, tell the user the required dashboard settings (full list in `references/dashboard-setup.md`):
1. Use the **Custom HTML** template under Web Pop-up, not the standard editor.
2. Confirm the delivered code matches what they told you about "Enable click tracking for Custom HTML" (ON = don't add `wzrk_c2a` anywhere; OFF = only the confirmed CTA(s) have it) — flag it if their answer implies a setting change is needed on their end.
3. For a Box, tell them to set it to 350 × 85 (the maximum; smaller is fine) in the dashboard, since the build is designed to fit inside that cap.
4. Mention SDK version floors and Delivery Preferences when relevant.

## Reference files — read the one that matches the task

- `references/clarifying-questions.md` — what to ask vs default, example question sets, how to proceed when the user says "just build it." Read whenever a brief is thin.
- `references/functions.md` — the CleverTap Web / parent-frame JS API; profile push; quick-reference; the do-not-invent list. Read for any exact signature.
- `references/web-popup.md` — Web Pop-up deep dive: the Box 350 × 85 size cap (with CSS pattern), per-layout wrapper-removal close mechanism, `wzrk_c2a` / `popupCallback` / `notificationCallback` click-tracking options, CTA URL capture rules, browser compat. Read for any Web Pop-up build.
- `references/dashboard-setup.md` — the dashboard settings, SDK version floors, wrapper IDs, delivery preferences. Read before delivering any campaign.
- `references/patterns-and-mistakes.md` — reusable patterns, common-mistakes list, the "it doesn't work" troubleshooting flow, and the pre-flight checklist. Read before finalizing.

## Core rules (always apply)

1. **Never guess the must-ask items** (layout, event names or skip-tracking choice, event triggers, CTA destination, click-tracking flag state, for Box the content (its size is fixed by the 350 × 85 cap), and — for Interstitial — the backdrop colour). Ask in one batched round; proceed only when specified or when the user says to use placeholders.
2. **Never invent a CleverTap API.** If unsure a method exists, check `references/functions.md`. Fakes like `recordEvent`, `clevertap.close`, and `closePopup()` fail silently or throw.
3. Generate only Web Pop-up code — never Mobile In-App code (`window.CleverTap`, `webkit.messageHandlers`, `wzrk://`).
4. Emit one guarded bridge helper for events and dismissal.
5. Object props for `clevertap.event.push` (no stringify needed, unlike Android in-app).
6. Always provide a working close path: remove the layout-correct wrapper id(s) from the parent page — there is no SDK close method to call instead.
7. Only add `wzrk_c2a` if the user confirmed "Enable click tracking for Custom HTML" is OFF, and only on the CTA(s) they named — if it's ON, never add it. Write CTA URLs **inline** either way so the SDK captures them for click-through attribution.
8. Responsive by default for desktop **and** mobile web. For Box, the hard cap is 350px wide × 85px tall: fill the iframe but clamp it (`html, body, .card { height: 100%; max-width: 350px; max-height: 85px }`, `overflow: hidden`), never rely on content height, and show only the elements the user asked for.
9. Keep it lightweight and self-contained: minimal/minified JS, no external scripts, no heavy frameworks, no `<form>` / `localStorage`.
10. Event names in top-level constants; editable copy/colours in a config object.
11. Fire an impression event and a CTA/claim event only if the user didn't choose to skip event tracking — never add tracking calls to a build that asked for none.
12. Deliver with the dashboard setup notes; never claim the code is tested until the user has run it on a real page.