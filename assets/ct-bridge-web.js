/* =============================================================================
 * CleverTap bridge helper — WEB POP-UP (browser iframe; reach SDK via window.parent).
 * Copy INLINE into the single campaign HTML file. Guarded, never throws.
 *
 * Set event NAMES to the strings the user gave you, OR delete the ctWebTrack lines
 * entirely if the user chose to skip event tracking — don't leave placeholder
 * tracking in a build that asked for none (see references/clarifying-questions.md).
 *
 * IMPORTANT: There is no documented `closePopup()` SDK method. Closing means
 * removing the wrapper element(s) CleverTap injected into the PARENT page, and the
 * id(s) differ by layout. Set LAYOUT below to 'box' | 'banner' | 'interstitial' to
 * match the campaign you confirmed with the user — see references/web-popup.md.
 * ============================================================================= */

// Event names + properties come from the user. Placeholders shown — replace them.
var EVT_VIEWED = 'TODO_EVENT_VIEWED';   // e.g. fired on load (impression)
var EVT_CLICKED = 'TODO_EVENT_CLICKED'; // e.g. fired on CTA / claim

// Must match the layout confirmed with the user — wrapper ids are NOT interchangeable.
var LAYOUT = 'box'; // 'box' | 'banner' | 'interstitial'

function ctWebTrack(name, props) {
  try { if (window.parent && window.parent.clevertap) window.parent.clevertap.event.push(name, props || {}); } catch (e) {}
}

// Close by removing the layout-specific wrapper the SDK injected into the parent page.
// Box -> wizParDiv0. Banner -> wizParDiv2 (NOT wizParDiv1). Interstitial -> TWO elements
// (intentOpacityDiv overlay + intentPreview wrapper), a different id family entirely.
function ctWebClose() {
  try {
    if (LAYOUT === 'box') {
      var box = window.parent.document.getElementById('wizParDiv0');
      if (box) setTimeout(function () { box.remove(); }, 0);
    } else if (LAYOUT === 'banner') {
      var banner = window.parent.document.getElementById('wizParDiv2');
      if (banner) setTimeout(function () { banner.remove(); }, 0);
    } else if (LAYOUT === 'interstitial') {
      var overlay = window.parent.document.getElementById('intentOpacityDiv');
      var wrapper = window.parent.document.getElementById('intentPreview');
      setTimeout(function () {
        if (overlay) overlay.remove();
        if (wrapper) wrapper.remove();
      }, 0);
    }
  } catch (e) {}
}

/* ----------------------------------------------------------------------------
 * Click tracking — pick ONE approach per element, don't mix on the same button.
 * -------------------------------------------------------------------------- */

/* Option 1 (default): wzrk_c2a attribute. ONLY use this if the user confirmed "Enable
 * click tracking for Custom HTML" is OFF, and only on the CTA(s) they named — if the
 * flag is ON, don't add wzrk_c2a anywhere, the SDK already tracks every button/link and
 * manual placement would double-count. Write the CTA URL INLINE or it's lost — the SDK
 * parses the onclick/href text itself, it doesn't execute your code:
 *   New tab : <button wzrk_c2a onclick="window.open('https://example.com','_blank')">Shop</button>
 *   Same tab: <a wzrk_c2a href="https://example.com"
 *                onclick="window.parent.location.href='https://example.com'">Shop</a>
 * A URL hidden in a named function fires the event but the URL is NOT captured. IE unsupported.
 */

/* Option 2: explicit trigger via popupCallback (SDK >= 1.1.0). Use when the click-tracked
 * action isn't a simple attribute click (e.g. after a multi-step interaction, form submit). */
var _ctNotificationObj;
function ctRegisterPopupCallback() {
  try {
    window.parent.clevertap.popupCallback = function (notificationData) {
      _ctNotificationObj = notificationData;
    };
  } catch (e) {}
}
function ctRaiseClicked() {
  try {
    if (window.parent && window.parent.clevertap && window.parent.clevertap.raisePopupNotificationClicked) {
      window.parent.clevertap.raisePopupNotificationClicked(_ctNotificationObj);
    }
  } catch (e) {}
}
// Call ctRegisterPopupCallback() once near the top of your script if using Option 2.

// Example:
//   ctWebTrack(EVT_VIEWED, { template:'Newsletter Popup' });                 // on load
//   ctWebTrack(EVT_CLICKED, { offer:'WELCOME10' }); ctWebClose();            // on claim/submit
