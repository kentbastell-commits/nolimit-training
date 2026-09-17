// Public store visibility switch.
//
// Pre-launch (2026-09-18) there are no real digital programs to sell yet, so
// the public store is hidden: /store and ?page=store render the landing page,
// every landing/legal/portal link that pointed at the store points at 1:1
// coaching instead, the portal's Store tab is gone, and /store drops out of
// the sitemap. Flip this to `true` to bring all of it back in one change —
// nothing store-related is deleted, only gated.
//
// Shared by the client bundle, the SEO server module and vite.config.ts, so
// keep this file dependency-free.
export const STORE_PUBLIC = false;
