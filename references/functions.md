# CleverTap Function Reference (Web Pop-up custom HTML)

Custom HTML/iframe surfaces only. **The API differs from Mobile In-App and is not
interchangeable.** Web Pop-up reaches the SDK via `window.parent.clevertap.*` — a
Mobile In-App call (`window.CleverTap`, `webkit.messageHandlers`) inside a Web Pop-up
silently does nothing.

Source: https://developer.clevertap.com/docs/web-popup — fetch to re-verify if unsure.

## Methods that DO NOT exist — never emit these
`window.parent.clevertap.closePopup()` (not documented anywhere — see Close below) ·
`clevertap.dismiss()` · `clevertap.closeInApp()` · `window.clevertap.hide()` ·
`clevertap.event.record(name,obj)`.
They look plausible and fail silently, or in the `closePopup` case, throw because the
method doesn't exist on the object. If tempted because the user "expects" it, look it up.

## 1. Record events
`window.parent.clevertap.event.push(name, props)` — object props, no stringify needed.

Use the `ctWebTrack()` helper (guarded, never throws) from `assets/ct-bridge-web.js`.

## 2. Close — per-layout wrapper removal (no SDK close method)
There's no `closePopup` call. Remove the wrapper element(s) CleverTap injected into the
parent page. **The id depends on the layout**:

| Layout | Element(s) to remove |
|---|---|
| Box | `window.parent.document.getElementById('wizParDiv0')` |
| Banner | `window.parent.document.getElementById('wizParDiv2')` |
| Interstitial | `window.parent.document.getElementById('intentOpacityDiv')` **and** `getElementById('intentPreview')` |

Full snippets in `references/web-popup.md`. Confirm the layout before writing this —
using the wrong id (or the Banner id on a Box, etc.) leaves the pop-up on screen.

## 3. Click tracking
- **`wzrk_c2a` attribute** — confirm the actual "Enable click tracking for Custom HTML"
  flag state with the user first (never assume). If ON, the SDK auto-adds it to every
  button/link and manual placement double-counts. If OFF, add it manually only to the
  CTA(s) the user named.
- **`popupCallback` + `raisePopupNotificationClicked(notificationObj)`** — SDK ≥ 1.1.0.
  Capture the notification object via `window.parent.clevertap.popupCallback = fn`, then
  call `window.parent.clevertap.raisePopupNotificationClicked(notificationObj)` from any
  handler to raise Notification Clicked explicitly.
- **`notificationCallback` + `renderNotificationViewed`/`renderNotificationClicked`** —
  for fully custom rendering pipelines, not typical Custom HTML template use. Both calls
  are required or nothing tracks. Payload: `{ msgId: '<campaignId>_<datestamp>', pivotId?: '<variant>' }`.

Full detail and code for all three in `references/web-popup.md`.

## 4. CTA URL capture
The click listener parses `onclick`/`href` text with a regex matching
`window.open("URL",` or `location.href = "URL"` (either quote style) — the URL must be
written inline, not built at runtime or hidden in a named function. Captured text props:
`wzrk_click_innerText`, `wzrk_click_id`, `wzrk_click_name`, `wzrk_click_value` (truncated
to 20 chars); URL values are not truncated.

## 5. Profile
`window.parent.clevertap.profile.push({ Site: { Name:'…', Email:'…' /* + custom */ } })`.

## 6. Web SDK (full page context, not the popup iframe itself)
```js
clevertap.privacy.push({ optOut:false });
clevertap.init('ACCOUNT_ID', 'region');   // region: 'global','eu1','in1','sg1','us1', …
clevertap.setLogLevel(3);
clevertap.event.push(name, props);
```
This runs on the host page (not inside the pop-up iframe); the pop-up itself always
reaches the SDK through `window.parent.clevertap`.

## Key reminders
- Web Pop-up args are always objects — no stringify step (unlike Android in-app).
- Always guard with `try/catch`; never assume `window.parent.clevertap` exists.
- Don't bury CTA URLs inside named functions if you need click-through attribution.
- Don't invent a `closePopup` method — use per-layout wrapper removal.
