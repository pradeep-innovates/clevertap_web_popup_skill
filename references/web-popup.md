# Web Pop-up (browser iframe) — Deep Dive

For any custom-HTML **Web Pop-up** build. The HTML runs **inside an iframe** on the
customer's website. It has its own DOM; to affect the page or the SDK it must go
through `window.parent`. Click/close tracking is a mix of **attribute-driven** (SDK
auto-injects a listener into the iframe body) and **explicit callback** approaches.

Source: https://developer.clevertap.com/docs/web-popup (fetch to re-verify if anything below seems stale).

## Box size cap — 350 × 85 maximum

A Box is capped at **350px wide × 85px tall**. This is a maximum, not a target: smaller
is fine, larger is never allowed. The dashboard sets the iframe size, but the HTML must
be built so it fits inside the cap no matter what — otherwise content gets clipped or the
layout breaks. That is why a Box is never built from the card template (a 360px card
with padding, title, message and CTA stacked vertically is ~200px tall).

Rules:
- Clamp the document and card: `max-width:350px; max-height:85px; overflow:hidden`, with
  `box-sizing:border-box` so padding is counted inside the cap.
- No fixed or minimum dimension above the cap anywhere (`width`, `min-width`, `height`,
  `min-height`), and no `vw`/`vh` value that can resolve past it.
- One row of content, vertically centred. Stacked elements must total under 85px
  including padding and gaps — if they don't, drop an element rather than overflow.
- If the user asks for a bigger Box, tell them it is capped at 350 × 85 and build within
  it; suggest Banner or Interstitial if they need more room.
- When delivering, tell them to set the Box to 350 × 85 (or smaller) in the dashboard.

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 100%; height: 100%;
  max-width: 350px; max-height: 85px;
  overflow: hidden; background: transparent !important;
}
.card {
  position: relative;
  width: 100%; height: 100%;
  max-width: 350px; max-height: 85px;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 0 28px 0 12px;      /* right padding leaves room for the ✕ */
  overflow: hidden;
}
```

## Close button — per-layout wrapper removal (the documented mechanism)

There is **no documented `closePopup()` method**. The officially documented way to
close a Custom HTML Web Pop-up is removing the parent wrapper element(s) that CleverTap
injected — and **the id differs by layout**. Confirm the layout before writing this
(see `clarifying-questions.md`):

**Box:**
```html
<div class="btn">CLOSE</div>
<script>
var btn = document.querySelector('.btn');
var wrapper = window.parent.document.getElementById('wizParDiv0');
btn.addEventListener('click', closePopUp);
function closePopUp() { setTimeout(() => { wrapper.remove(); }, 0); }
</script>
```

**Banner:**
```html
<div class="btn">CLOSE</div>
<script>
var btn = document.querySelector('.btn');
var wrapper = window.parent.document.getElementById('wizParDiv2'); // NOT wizParDiv1
btn.addEventListener('click', closePopUp);
function closePopUp() { setTimeout(() => { wrapper.remove(); }, 0); }
</script>
```

**Interstitial** (two elements — an overlay AND a wrapper, different ids entirely):
```html
<div class="btn">CLOSE</div>
<script>
var btn = document.querySelector('.btn');
var overlay = window.parent.document.getElementById('intentOpacityDiv');
var wrapper = window.parent.document.getElementById('intentPreview');
btn.addEventListener('click', closePopUp);
function closePopUp() { setTimeout(() => { overlay.remove(); wrapper.remove(); }, 0); }
</script>
```

**Do not reuse one id across layouts** — Banner is `wizParDiv2`, not `wizParDiv1`, and
Interstitial doesn't use the `wizParDiv*` family at all. Wrap in `try/catch` since these
ids are internal and could change between SDK versions; the `setTimeout(...,0)` defers
removal to the next tick, matching the documented pattern.

## Interstitial backdrop — semi-transparent black by default, confirm with the user

An interstitial covers the whole viewport, so what shows behind the card matters.
- **Default:** semi-transparent black, `rgba(0,0,0,0.6)` — dims the host page and keeps
  attention on the card. Set it on the full-viewport `.overlay` element inside the HTML
  (the template exposes it as the `--popup-backdrop` CSS variable).
- **Confirm it** in the batched clarifying round (see `clarifying-questions.md`). If the
  user supplies another colour or opacity, put that value in `--popup-backdrop` instead.
- **Box and Banner stay `transparent`** — the host page should remain visible around them.
- Backdrop is purely visual: the close script still removes **both** `intentOpacityDiv`
  and `intentPreview`, and the close button must stay reachable on top of the dim layer.
- If the user says "just build it," ship the default and list it under the file's assumptions.

## Click tracking — three mechanisms, pick based on what the build needs

**1. `wzrk_c2a` attribute (the default / simplest).**
- **Always confirm the flag's actual state with the user before writing anything** — don't
  assume it's ON or OFF (see `clarifying-questions.md`).
- "Enable click tracking for Custom HTML" flag ON when creating the campaign → SDK
  auto-adds `wzrk_c2a` to **every** `<button>` and `<a>`. Do NOT add `wzrk_c2a` manually
  anywhere in this case — it would double-count.
- Flag OFF → nothing is auto-tracked. Add `wzrk_c2a` only to the specific CTA(s) the user
  named, e.g. `<button wzrk_c2a>Click Me</button>`.
- The SDK adds one listener on the iframe body and raises **Notification Clicked**;
  it uses `Element.closest('a[wzrk_c2a], button[wzrk_c2a]')`, so a `<span>` inside a
  tracked button still attributes correctly. Not supported on IE (no polyfill).

**2. `popupCallback` + `raisePopupNotificationClicked` (SDK ≥ 1.1.0, explicit trigger).**
Use when you need to raise Notification Clicked from arbitrary JS logic rather than
relying on the attribute listener (e.g. after a multi-step interaction, not a single click):
```html
<script>
var notificationObj;
window.parent.clevertap.popupCallback = (notificationData) => {
  notificationObj = notificationData;
};
</script>
```
Then, in any handler:
```js
function submit_pressed() {
  window.parent.clevertap.raisePopupNotificationClicked(notificationObj);
}
```

**3. `notificationCallback` + `renderNotificationViewed` / `renderNotificationClicked` (fully custom rendering).**
Only relevant if you're taking over rendering entirely (not typical for a Custom HTML
campaign built from a template — this is for building your own delivery/render pipeline).
You must explicitly call both `renderNotificationViewed()` and `renderNotificationClicked()`
or nothing gets tracked:
```js
let customNotificationPayload = {
  msgId: '...',   // required — format: campaignId_datestamp, e.g. "1630318544_20211004"
  pivotId: '...'  // optional — A/B testing variant name
};
clevertap.notificationCallback = function (msg) {
  clevertap.renderNotificationViewed(customNotificationPayload);
  // your custom rendering here
  someButton.addEventListener('click', function () {
    clevertap.renderNotificationClicked(customNotificationPayload);
  });
};
```

For a normal Custom HTML template pasted into the dashboard editor, mechanism 1 (and
2 if you need explicit control) is what applies — mechanism 3 is a different, lower-level
integration path.

## CTA URL capture — write the URL INLINE or it's lost

The SDK's click listener parses the `onclick`/`href` attribute text itself with a regex
looking for `window.open("...` or `location.href = "...` (either quote style) — it does
not execute your code to find the URL. So the destination must appear literally in the
attribute. Captured forms:

```html
<!-- open in a NEW tab -->
<button wzrk_c2a onclick="window.open('https://example.com','_blank')">Shop Now</button>

<!-- open in the SAME tab -->
<a wzrk_c2a href="https://example.com"
   onclick="window.parent.location.href='https://example.com'">Shop Now</a>
```

NOT captured (event still fires, but no URL recorded):
```html
<button wzrk_c2a onclick="goTo()">Shop Now</button>
<script>function goTo(){ window.open('https://example.com','_blank'); }</script>
```

Captured text props are namespaced `wzrk_click_innerText`, `wzrk_click_id`,
`wzrk_click_name`, `wzrk_click_value` — each truncated to 20 chars; `href`/URL values are not.

## Event tracking

```js
function ctWebTrack(name, props) {
  try { if (window.parent?.clevertap) window.parent.clevertap.event.push(name, props || {}); }
  catch (e) {}
}
```
Object props are fine here (no stringify needed, unlike Android in-app).

## Custom HTML template payload shape

The dashboard stores/delivers the campaign roughly as:
```json
{
  "msgContent": {
    "html": "<Your HTML goes here/>",
    "type": 1,
    "templateType": "banner",
    "title": "Title goes here",
    "description": "Description goes here",
    "kv": { "key1": "value1", "key2": "value2" }
  },
  "msgId": "campaignId_date"
}
```
`templateType` is `box` / `banner` / `interstitial`. `title`/`description` are optional
metadata fields, not necessarily rendered by your custom HTML. This is background for
understanding the delivery format — you don't need to hand-author this JSON; the
dashboard generates it from your HTML.

## Dismiss spam control

`dismissSpamControl` restricts whether a closed campaign can reappear in the same session.
- `false`: once shown and dismissed, the campaign won't show again until a new session
  begins and the user re-qualifies. Evaluated per-campaign, not globally.
- `true` (default since Web SDK ≥ 2.0.0): the campaign can reappear repeatedly within
  the same session as long as the user keeps qualifying, even after being closed.
- If the user wants precise control over frequency (once per session/day, etc.), point
  them to the campaign's **Delivery Preferences** — that's the primary control; only
  set `dismissSpamControl = false` if Delivery Preferences aren't configured and they
  want a strict "once per session" close behaviour.

## Layout & compatibility

- Responsive for desktop **and** mobile web — the pop-up can appear on any viewport.
- Use `target="_top"` / `rel="noopener"` on anchors that navigate.
- Match the chosen campaign layout (Box vs Banner vs Interstitial) — sizing/positioning
  AND the close-button wrapper ids differ.

## Don't

- Don't use `window.CleverTap` / iOS `webkit.messageHandlers` / `wzrk://` here — that's Mobile In-App.
- Don't call an undocumented `closePopup()` — use the per-layout wrapper removal above.
- Don't reuse the Box wrapper id (`wizParDiv0`) for Banner (`wizParDiv2`) or vice versa.
- Don't bury CTA URLs in functions if you need click-through attribution.
- Don't assume the parent page is same-origin for arbitrary DOM access; stick to the SDK API.
- Don't add `wzrk_c2a` (or omit it) without first confirming the actual "Enable click tracking for Custom HTML" flag state — guessing either way breaks click attribution.
- Don't add event tracking calls if the user chose to skip tracking entirely.
