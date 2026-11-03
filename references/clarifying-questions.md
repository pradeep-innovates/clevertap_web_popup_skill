# Clarifying Questions — Ask Before Building

CleverTap campaigns break quietly when details are invented. The default posture is:
**gather the must-haves first, in one batched round, then build.** Don't drip questions,
and don't ask about things the brief already answered or that have safe cosmetic defaults.

## Must-ask (never invent)

| Item | Why it can't be guessed |
|---|---|
| **Layout** — Box / Banner / Interstitial | Sizing/positioning differs; wrong layout renders broken and determines which wrapper `id` the close-button script must target (see `web-popup.md`). |
| **Event names** — pick one: (1) use placeholders, (2) type exact names now, (3) skip event tracking entirely | They appear verbatim in dashboard funnels and usually follow a house convention (`Pack Opened` vs `pack_opened`). A made-up name pollutes analytics — but some builds genuinely don't need tracking, so "no events at all" must be an explicit option, not an assumption. |
| **Event triggers** (which actions fire which events) | Silently deciding "I'll track a click" may double-count or miss the action they cared about. Skip this question entirely if the user chose "skip event tracking" above. |
| **Event properties** | Which fields matter (coupon, prize, variant, product id, rarity, score). Skip if no event tracking. |
| **CTA behaviour + destination** | Close? Open URL (which, same tab or new tab)? Determines the inline `onclick`/`href` pattern used for click capture. |
| **"Enable click tracking for Custom HTML" flag** — ON or OFF | Determines whether `wzrk_c2a` is added at all. If ON, the SDK auto-tracks every button/link — adding `wzrk_c2a` manually anywhere double-counts clicks, so don't add it. If OFF, ask which specific CTA(s) should get `wzrk_c2a` — nothing is tracked unless you add it there. |
| **Interstitial only — backdrop colour** | An interstitial covers the full viewport, so the backdrop is a brand call. Propose the default — **semi-transparent black, `rgba(0,0,0,0.6)`** — and ask the user to confirm it or supply their own colour/opacity. Don't ask for Box or Banner (backdrop stays transparent so the host page remains visible). |
| **Box only — content** | A Box is capped at **350 × 85**, so there is room for roughly one row. Ask which elements to show (title only, title + timer, CTA, subtitle…). Do **not** ask for the Box size: the cap is fixed — say "built to fit within 350 × 85" instead. If they give a smaller size, use it; if they ask for larger, explain the cap. See `web-popup.md` → "Box size cap". |

## May default (state the assumption; keep editable)

Copy text, colours, fonts, and the coupon placeholder value are cosmetic. Pick sensible
defaults, put them in the config block at the top, and tell the user: "I assumed X — say
the word and I'll change it."

## Skip asking when…

- The brief already specifies the item. Example: a prompt that says fire
  `Newsletter_Popup_Viewed` on load and `Newsletter_Signed_Up` on submit has given you both
  the event names and the triggers — build, don't re-ask.
- The user says "just build it" / "use placeholders." Then proceed, but mark every invented
  value with `TODO:` and list all assumptions at the top of the file so nothing is hidden.
  Use obvious placeholder event names like `TODO_EVENT_VIEWED` so they can't slip into production.
  For an Interstitial, use the default semi-transparent black backdrop and list it among the assumptions.
- The user picks "skip event tracking entirely." Then don't ask about triggers or
  properties either — build the campaign with no `ctWebTrack` calls at all (still keep the
  close/CTA logic). Don't silently add tracking back in later in the same build.

## Event-name question — always offer three choices, not two

Don't just offer "placeholders vs type them now" — always include a third option to skip
event tracking entirely, since some campaigns (a simple informational banner, for instance)
genuinely don't need it and shouldn't be pushed into adding events they don't want:
1. Use placeholders (`TODO_` names, rename later)
2. I'll type the exact names now
3. Skip event tracking — don't add any events

## How to ask (templates)

Keep it to one message.

**Thin brief — "make me a CleverTap web popup for our sale":**
> A few quick things so I wire it correctly:
> 1. Layout — Box, Banner, or Interstitial?
> 2. Event names — use placeholders, type the exact names now, or skip event tracking entirely?
> 3. If tracking: when should each event fire, and any properties to send (coupon code, product, variant)?
> 4. What does the main button do — close, or open a URL? Same tab or new tab?
> 5. Is "Enable click tracking for Custom HTML" ON or OFF in the dashboard? If OFF, which CTA(s) should get `wzrk_c2a`?
> 6. *(Only if Interstitial)* Backdrop behind the card — I'll use semi-transparent black (`rgba(0,0,0,0.6)`) unless you want a different colour or opacity. OK?
> 7. *(Only if Box)* Which elements should it show — title only, title + timer, a CTA, something else? (Box is built to fit within 350 × 85.)

**Medium brief — type known, events not:**
> Got it — a newsletter sign-up popup. A couple more things before I build:
> 1. What should the view and sign-up events be named (your convention) — or should I skip event tracking?
> 2. After sign-up, should it close, or redirect to a URL?
> 3. Is click tracking for Custom HTML ON or OFF in your dashboard?

**Existing HTML to fix:**
> Before I change the tracking — what are the exact event names you use, and on which actions should each fire? I don't want to rename anything you're already reporting on.

## Guardrail

If you catch yourself picking an event name, a trigger point, a CTA destination, or the
`wzrk_c2a` placement because the brief didn't say — stop and ask instead. That decision
belongs to the user, not the template. Never add `wzrk_c2a` without first knowing whether
the dashboard's "Enable click tracking for Custom HTML" flag is ON (in which case adding it
manually double-counts) or OFF (in which case it's the only way clicks get tracked).
