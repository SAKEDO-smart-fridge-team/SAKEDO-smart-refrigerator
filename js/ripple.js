/**
 * Global ripple effect for all button-like elements.
 * Automatically applied to: button, .btn-*, .nav-item, .s-card, .u-card, .camera-btn
 */
(function () {
  const RIPPLE_SELECTORS = [
    "button",
    "[class*='btn-']",
    ".nav-item",
    ".s-card",
    ".u-card",
    ".camera-btn",
    ".recipe-card",
    ".fridge-item",
  ].join(", ");

  function createRipple(event) {
    const target = event.currentTarget;

    // Skip elements that already have non-overflow hidden set and don't support ripple
    const computed = window.getComputedStyle(target);
    if (computed.overflow === "visible") {
      target.style.overflow = "hidden";
    }

    const ripple = document.createElement("span");
    ripple.classList.add("ripple-effect");

    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    target.appendChild(ripple);

    ripple.addEventListener("animationend", () => ripple.remove());
  }

  function attachRipple(el) {
    if (el._rippleAttached) return;
    el._rippleAttached = true;
    el.addEventListener("click", createRipple);
  }

  function bindAll() {
    document.querySelectorAll(RIPPLE_SELECTORS).forEach(attachRipple);
  }

  // Bind on load and after each page navigation
  document.addEventListener("DOMContentLoaded", bindAll);
  document.addEventListener("pageChanged", () => {
    // Small delay to let new HTML render
    setTimeout(bindAll, 50);
  });

  // Also observe DOM mutations for dynamically added elements
  const observer = new MutationObserver(() => bindAll());
  document.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
