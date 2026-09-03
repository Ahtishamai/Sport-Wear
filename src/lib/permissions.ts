/**
 * Per-user access to areas of the admin.
 *
 * An account is either an ADMIN, who sees everything, or an EDITOR limited to
 * a chosen set of areas — so a person who only handles orders never sees the
 * stores, the catalogue or the site settings.
 *
 * Areas are deliberately coarse. Every admin screen and every API resource
 * belongs to exactly one, so a screen someone can open is always a screen
 * whose data they can actually load and save.
 */

export type AreaKey = 'orders' | 'stores' | 'catalog' | 'content' | 'settings' | 'users';

export type Area = {
  key: AreaKey;
  label: string;
  description: string;
  /** Resource names in RESOURCES that this area covers. */
  resources: string[];
  /** Admin paths this area unlocks; the first is where the area opens. */
  paths: string[];
};

export const AREAS: Area[] = [
  {
    key: 'orders',
    label: 'Orders & leads',
    description: 'Store orders, quote requests and contact messages.',
    resources: ['storeOrders', 'quotes', 'contacts'],
    paths: ['/admin/store-orders', '/admin/quotes', '/admin/contacts'],
  },
  {
    key: 'stores',
    label: 'Team stores',
    description: 'Create and edit team stores, their sections and designs.',
    resources: ['stores', 'storeCategories', 'storeItems'],
    paths: ['/admin/stores'],
  },
  {
    key: 'catalog',
    label: 'Catalogue',
    description: 'Products, collections and team packages.',
    resources: ['products', 'collections', 'packages'],
    paths: ['/admin/products', '/admin/collections', '/admin/packages'],
  },
  {
    key: 'content',
    label: 'Site content',
    description: 'Pages, reviews, FAQs and the media library.',
    resources: ['pages', 'reviews', 'faqs', 'media'],
    paths: ['/admin/pages', '/admin/reviews', '/admin/faqs', '/admin/media'],
  },
  {
    key: 'settings',
    label: 'Settings & navigation',
    description: 'Site settings, payments and the menus. Sensitive.',
    resources: ['settings', 'nav'],
    paths: ['/admin/settings', '/admin/navigation'],
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Add and remove admin accounts. Sensitive.',
    resources: ['users'],
    paths: ['/admin/users'],
  },
];

const ALL_KEYS = AREAS.map((a) => a.key);

export type Accessor = { role: 'ADMIN' | 'EDITOR'; permissions?: unknown };

/** Areas this account may use. ADMIN always gets all of them. */
export function allowedAreas(user: Accessor): AreaKey[] {
  if (user.role === 'ADMIN') return [...ALL_KEYS];
  const raw = Array.isArray(user.permissions) ? (user.permissions as unknown[]) : [];
  const chosen = raw.filter((k): k is AreaKey => ALL_KEYS.includes(k as AreaKey));
  // An editor with nothing chosen would see an empty panel and be unable to
  // do the job they were added for, so fall back to the least sensitive area.
  return chosen.length ? chosen : ['orders'];
}

export function canUseArea(user: Accessor, area: AreaKey): boolean {
  return allowedAreas(user).includes(area);
}

const RESOURCE_AREA = new Map<string, AreaKey>(
  AREAS.flatMap((a) => a.resources.map((r) => [r, a.key] as [string, AreaKey]))
);

/** Which area a given admin API resource belongs to, if any. */
export function areaForResource(resource: string): AreaKey | null {
  return RESOURCE_AREA.get(resource) ?? null;
}

export function canUseResource(user: Accessor, resource: string): boolean {
  const area = areaForResource(resource);
  // An unmapped resource is only reachable by a full admin — failing closed
  // means adding a resource without a home cannot silently expose it.
  if (!area) return user.role === 'ADMIN';
  return canUseArea(user, area);
}

/** Whether an /admin path is inside an area this account may use. */
export function canUsePath(user: Accessor, pathname: string): boolean {
  if (pathname === '/admin' || pathname === '/admin/') return true;
  const areas = allowedAreas(user);
  for (const a of AREAS) {
    if (a.paths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return areas.includes(a.key);
    }
  }
  // Unknown admin path: only a full admin gets in.
  return user.role === 'ADMIN';
}

/** Where to send someone who lands somewhere they cannot use. */
export function landingPath(user: Accessor): string {
  const areas = allowedAreas(user);
  const first = AREAS.find((a) => areas.includes(a.key));
  return first?.paths[0] ?? '/admin';
}
