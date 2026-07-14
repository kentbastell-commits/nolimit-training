import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/* Renders children into the .app root via a portal. Fixed-position overlays
   (builder popups, drawers, context menus) must not stay nested inside page
   containers: any ancestor with a transform/filter/animation becomes their
   containing block (named mistake #34) and the overlay anchors to the page
   column instead of the viewport. The .app shell is guaranteed animation-free
   (nl-anim refuses shells), and keeping the portal inside .app preserves all
   `.app:not(.clientPortalApp) …` scoped styling. */
export default function PortalToApp({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  const host = typeof document !== "undefined" ? document.querySelector(".app") : null;
  if (!host) return <>{children}</>;
  return createPortal(children, host);
}
