// Public store visibility switch.
//
// Pre-launch (2026-09-18) there are no real digital programs to sell yet, so
// the public store is hidden: /store and ?page=store render the landing page,
// every landing/legal/portal link that pointed at the store points at 1:1
// coaching instead, the portal's Store tab is gone, and /store drops out of
// the sitemap. Flip this to `true` to bring all of it back in one change —
// nothing store-related is deleted, only gated.
//
// This also blocks the public catalog, digital order creation and new digital
// payment transactions on the server, including cached/older mini programs.
// Existing athlete access, paid receipts and coaching checkout stay available.
// Shared by the client bundle, checkout server, SEO and vite.config.ts, so
// keep this file dependency-free.
export const STORE_PUBLIC = false;
