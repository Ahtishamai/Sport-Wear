/**
 * Ad landing pages.
 *
 * Each one lives at a plain address of its own — /custom-pinstripe-uniforms —
 * drawn in the stripped-down frame of app/(landing)/layout.tsx, and its words
 * are the CMS page with the same slug and an "lp-" in front
 * (lp-custom-pinstripe-uniforms), edited in Admin → Pages.
 *
 * A new one needs its address added here and a two-line route beside
 * app/(landing)/custom-pinstripe-uniforms. The route has to exist as a folder
 * of its own, because that is how it gets the landing frame rather than the
 * shop's header and footer.
 */
export const LANDING_PAGES = ['custom-pinstripe-uniforms'] as const;

export const LANDING_PREFIX = 'lp-';

/** "custom-pinstripe-uniforms" → "lp-custom-pinstripe-uniforms". */
export const landingCmsSlug = (path: string) => `${LANDING_PREFIX}${path}`;

export function isLandingPath(path: string): boolean {
  return (LANDING_PAGES as readonly string[]).includes(path);
}
