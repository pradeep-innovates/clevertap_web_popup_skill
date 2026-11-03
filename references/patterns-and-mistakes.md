# Patterns, Common Mistakes, Troubleshooting & Checklist (Web Pop-up)

## Reusable patterns

- **Clarify-first.** If layout, event-tracking choice, triggers, CTA destination, or the
  "Enable click tracking for Custom HTML" flag state aren't in the brief, ask before
  building (see `clarifying-questions.md`). Don't invent them.
- **Guarded bridge helper** — event tracking always wrapped in `try/catch`, never
  assuming `window.parent.clevertap` exists. See `assets/ct-bridge-web.js`.
- **Layout-specific close** — remove the wrapper element(s) the SDK injected into the
  parent page. Box → `wizParDiv0`. Banner → `wizParDiv2`. Interstitial → `intentOpacityDiv`
  + `intentPreview`. There is no SDK close method to fall back to — get the layout right.
- **Event-name + trigger constants** at the top: `var EVT_VIEWED = '<confirmed name>'`.
- **Config-object templates** — keep copy/colours/timing/behaviour in one object so a marketer
  edits only data, never logic. Preferred for anything reused.
- **Inline CTA URLs** — always write the destination directly in `onclick`/`href`, never inside
  a named function, so the SDK's click parser can capture it.
- **`wzrk_c2a` placement follows the confirmed flag state, never a default** — only add it
  if the user said "Enable click tracking for Custom HTML" is OFF, and only to the CTA(s)
  they named. If it's ON, adding `wzrk_c2a` anywhere double-counts clicks.
- **Explicit click trigger when needed** — if the tracked action isn't a plain element click
  (multi-step interaction, custom form), use `popupCallback` + `raisePopupNotificationClicked`
  (SDK ≥ 1.1.0) instead of relying on `wzrk_c2a`.
- **Reveal-then-track** for interactive types (coupon reveal, quiz result): animate the result,
  then on accept fire the event (with confirmed props) and close, often inside a `setTimeout`
  after the animation.
- **No tracking is a valid build** — if the user chose "skip event tracking entirely," ship
  the campaign with zero `ctWebTrack` calls. Don't add a "just in case" impression event.

### Weighted random selection (offer/variant drops)
```js
function pickWeighted(pool){              // weights are RELATIVE, not percentages
  var total = pool.reduce(function(s,p){return s+p.weight;},0), r = Math.random()*total;
  for (var i=0;i<pool.length;i++){ if (r<pool[i].weight) return pool[i]; r-=pool[i].weight; }
  return pool[pool.length-1];
}
// [{name:'10% off',weight:80},{name:'20% off',weight:15},{name:'Free shipping',weight:5}]
```
For a "no drop" branch, add a `null` item with the remaining weight — don't silently renormalize.

## Common mistakes (catch every one)
1. **Inventing event names / trigger points / CTA destinations / click-tracking flag state** the brief didn't specify. Ask instead — including whether tracking is wanted at all.
2. **Hallucinated APIs** — `closePopup()`, `clevertap.dismiss()`, `clevertap.closeInApp()`
   (none exist; `closePopup` in particular is not documented anywhere and will throw).
3. **Using the wrong wrapper id for the layout** — Banner is `wizParDiv2`, not `wizParDiv1`;
   Interstitial isn't `wizParDiv*` at all. Mixing these up leaves the pop-up stuck on screen.
4. **Hiding a CTA URL inside a named function** so click-tracking can't capture it for attribution.
5. **Wrong layout** for the campaign (Interstitial code in a Box campaign renders broken; also
   means the close script targets the wrong element entirely).
6. **Heavy assets / external scripts / `<form>` / `localStorage`** in the pop-up.
7. **Ungated SDK calls** throwing errors when `window.parent.clevertap` isn't ready yet.
8. Emitting **Mobile In-App** code (`window.CleverTap`, `webkit.messageHandlers`, `wzrk://`) in a web pop-up — that's a different runtime (see the clevertap-inapp-campaigns skill).
9. Assuming the parent page is same-origin for arbitrary DOM access instead of sticking to the SDK API.
10. **Adding `wzrk_c2a` without confirming the "Enable click tracking for Custom HTML" flag state** — if it's ON, manual `wzrk_c2a` double-counts; if OFF and you skipped adding it, nothing gets tracked at all.
11. **Adding event tracking to a build that asked for none** — "skip event tracking" is a real choice, not a placeholder for "figure it out later."
12. **Interstitial with a fully transparent (or unconfirmed) backdrop** — the card floats over a fully visible page and reads as a Box. Use the semi-transparent black default and confirm it; conversely, don't dim Box/Banner.

13. **Box wider than 350px or taller than 85px** — using the card template for a Box, a fixed `width`/`min-width` above 350px, a `min-height`/`height` above 85px, or vertically stacked content that adds up past 85px. The Box is capped at 350 × 85; clamp it with `max-width`/`max-height` and `overflow:hidden`, and drop elements rather than overflow.

## "It doesn't work" — diagnose in this order (don't guess, don't argue)
1. **API correct?** Re-check `functions.md` / `web-popup.md`. If you used a method not
   listed there (especially `closePopup`), you probably invented it.
2. **Close button does nothing?** Check the wrapper id matches the actual layout
   (Box/Banner/Interstitial) — the most common cause of a "dead" close button.
3. **Testing on the live site or just the dashboard preview?** `window.parent.clevertap`
   only exists once the SDK has loaded on the host page.
4. **Console errors?** Browser devtools on the actual page hosting the pop-up.
5. **CTA URL not tracked?** Check the URL is written inline in `onclick`/`href`, not inside a
   named function.
6. **Clicks not tracked (or double-counted)?** Check the actual "Enable click tracking for
   Custom HTML" flag state in the dashboard against what was assumed when writing `wzrk_c2a`
   placement — mismatches here cause both silent under-counting and double-counting.
7. **"Only shows once" / "shows too often"** → `dismissSpamControl` default (true since Web
   SDK ≥ 2.0.0) vs. Delivery Preferences — check which is actually configured.

## Pre-flight checklist (run before returning code)
- [ ] Asked for / confirmed: layout, event-tracking choice (placeholders/exact/skip), triggers if tracking, CTA destination, and the click-tracking flag state.
- [ ] Interstitial only: backdrop confirmed with the user (default semi-transparent black `rgba(0,0,0,0.6)`); Box/Banner backdrop left transparent.
- [ ] Box only: nothing wider than 350px or taller than 85px anywhere in the CSS (including min-sizes and padding); one-row compact strip; only the requested elements; told the user to set 350 × 85 (or smaller) in the dashboard.
- [ ] Correct runtime for the surface; no cross-contamination with Mobile In-App code.
- [ ] No invented/hallucinated CleverTap APIs — especially no `closePopup()`.
- [ ] Every SDK call guarded; tracking wrapped in `try/catch`.
- [ ] If tracking wasn't skipped: events use object props via `clevertap.event.push`.
- [ ] If tracking was skipped: no `ctWebTrack` calls anywhere in the file.
- [ ] Close script targets the correct wrapper id(s) for the confirmed layout.
- [ ] `wzrk_c2a` present only if the flag is confirmed OFF, and only on the named CTA(s) —
      absent everywhere if the flag is ON. (Or `popupCallback`/`raisePopupNotificationClicked`
      if that's the more appropriate mechanism.) Inline URL either way (new-tab vs same-tab
      form correct).
- [ ] Responsive for desktop and mobile web.
- [ ] Lightweight & self-contained: no external scripts/forms/localStorage/heavy frameworks.
- [ ] Event names (if any) in constants; editable content in a config object.
- [ ] Delivered with dashboard setup notes; not claimed as tested until run on a real page.
