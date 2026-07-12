/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// NoLimit — app-wide animation auto-layer (Tier 0)
//   • Staggered entrance: the primary content column's direct children fade +
//     rise in sequence on mount / navigation.
//   • Breathing hero glow: any element with a gold radial-gradient background
//     gets a slow scale/opacity pulse.
// Adapted from the provided framework-agnostic drop-in for this React SPA. Call
// window.nlAnimReplay() on navigation (wired in App.tsx) so the entrance
// replays per page. Honours prefers-reduced-motion (also guarded in nl-anim.css).
// ============================================================================
declare global {
  interface Window {
    nlAnimReplay?: () => void;
  }
}

(function () {
  const K = "__nlAnim";
  const prefersReduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Find the section list to stagger: pick the tallest body subtree, then
  // descend through single-wrapper containers (…#root › .app › .main) until we
  // reach the real list of content sections.
  function pick(): Element[] | null {
    const divs = ([].slice.call(document.body.children) as any[]).filter(
      (n) => n.nodeType === 1 && n.offsetHeight > 0
    );
    if (!divs.length) return null;
    let wrap: any = divs.sort((a, b) => b.offsetHeight - a.offsetHeight)[0];
    let kids: any[] = ([].slice.call(wrap.children) as any[]).filter(
      (n) => n.nodeType === 1
    );
    let guard = 0;
    while (
      kids.length <= 2 &&
      kids.length &&
      kids[kids.length - 1].children.length > 2 &&
      guard++ < 3
    ) {
      wrap = kids[kids.length - 1];
      kids = ([].slice.call(wrap.children) as any[]).filter(
        (n) => n.nodeType === 1
      );
    }
    return kids;
  }

  function glow() {
    document.querySelectorAll("div").forEach((el: any) => {
      if (el[K + "g"]) return;
      const bg = (el.style && el.style.backgroundImage) || "";
      if (
        /radial-gradient/.test(bg) &&
        /21[24],\s*175,\s*55|rgba\(214|d4af37/i.test(bg)
      ) {
        el[K + "g"] = 1;
        el.style.animation = "nlGlow 6s ease-in-out infinite";
      }
    });
  }

  function apply(): boolean {
    if (prefersReduce) return true;
    const kids = pick();
    if (!kids || !kids.length) return false;
    kids.forEach((el: any, i) => {
      if (el[K]) return;
      el[K] = 1;
      el.style.animation = "nlRise .5s ease both";
      el.style.animationDelay = i * 55 + "ms";
    });
    glow();
    return true;
  }

  // Route/tab change: clear the flags and re-run so the entrance replays.
  window.nlAnimReplay = function () {
    if (prefersReduce) return;
    document.querySelectorAll("*").forEach((el: any) => {
      el[K] = 0;
      el[K + "g"] = 0;
    });
    apply();
  };

  function boot() {
    let t = 0;
    const iv = setInterval(() => {
      if (apply() || ++t > 50) clearInterval(iv);
    }, 40);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

export {};
