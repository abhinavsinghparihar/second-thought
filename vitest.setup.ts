/**
 * Test environment setup.
 *
 * The shipped clarification panel attaches a **closed** shadow root, which is
 * correct for production (no page script can reach in) but makes the panel
 * untestable. Opening it here keeps production behaviour intact while letting
 * the DOM tests drive the real component.
 *
 * This file is loaded for *every* suite, including the node-environment ones,
 * so it must no-op when there is no DOM.
 */

if (typeof Element !== 'undefined') {
  const attachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function patched(this: Element, init: ShadowRootInit): ShadowRoot {
    return attachShadow.call(this, { ...init, mode: 'open' });
  } as typeof Element.prototype.attachShadow;
}
