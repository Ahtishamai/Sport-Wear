import { describe, expect, it } from 'vitest';
import {
  AREAS,
  allowedAreas,
  areaForResource,
  canUseArea,
  canUsePath,
  canUseResource,
  landingPath,
  type Accessor,
} from '@/lib/permissions';

const admin: Accessor = { role: 'ADMIN' };
const editor = (permissions: unknown): Accessor => ({ role: 'EDITOR', permissions });

describe('what an account may use', () => {
  it('gives an admin every area', () => {
    expect(allowedAreas(admin)).toEqual(AREAS.map((a) => a.key));
  });

  it('gives an editor the areas they were chosen for', () => {
    expect(allowedAreas(editor(['orders', 'catalog']))).toEqual(['orders', 'catalog']);
  });

  it('falls back to orders rather than an empty panel', () => {
    // An editor with nothing chosen was added to do something; the least
    // sensitive area is a better answer than a screen with nothing on it.
    expect(allowedAreas(editor([]))).toEqual(['orders']);
    expect(allowedAreas(editor(undefined))).toEqual(['orders']);
    expect(allowedAreas(editor('settings'))).toEqual(['orders']);
  });

  it('ignores an area that does not exist', () => {
    expect(allowedAreas(editor(['catalog', 'nonsense']))).toEqual(['catalog']);
    expect(allowedAreas(editor(['nonsense']))).toEqual(['orders']);
  });

  it('does not let an editor into an area they were not given', () => {
    expect(canUseArea(editor(['orders']), 'orders')).toBe(true);
    expect(canUseArea(editor(['orders']), 'settings')).toBe(false);
    expect(canUseArea(editor(['orders']), 'users')).toBe(false);
    expect(canUseArea(admin, 'users')).toBe(true);
  });
});

describe('the data behind a screen', () => {
  it('belongs to the same area as the screen', () => {
    expect(areaForResource('products')).toBe('catalog');
    expect(areaForResource('redirects')).toBe('settings');
    expect(areaForResource('users')).toBe('users');
  });

  it('is open to an editor only through their own areas', () => {
    const cataloguer = editor(['catalog']);
    expect(canUseResource(cataloguer, 'products')).toBe(true);
    expect(canUseResource(cataloguer, 'discounts')).toBe(true);
    expect(canUseResource(cataloguer, 'users')).toBe(false);
    expect(canUseResource(cataloguer, 'settings')).toBe(false);
  });

  it('fails closed for a resource with no area', () => {
    // Adding a resource and forgetting to give it a home must not quietly
    // open it to everybody.
    expect(areaForResource('something-new')).toBeNull();
    expect(canUseResource(editor(['catalog']), 'something-new')).toBe(false);
    expect(canUseResource(admin, 'something-new')).toBe(true);
  });
});

describe('the screens an account can open', () => {
  const orders = editor(['orders']);

  it('lets everybody at the front page and the trash', () => {
    expect(canUsePath(orders, '/admin')).toBe(true);
    expect(canUsePath(orders, '/admin/')).toBe(true);
    // Trash only ever lists what their own areas deleted.
    expect(canUsePath(orders, '/admin/trash')).toBe(true);
  });

  it('opens a screen inside their areas, and what sits under it', () => {
    expect(canUsePath(orders, '/admin/shop-orders')).toBe(true);
    expect(canUsePath(orders, '/admin/shop-orders/DS12345')).toBe(true);
  });

  it('keeps them out of a screen outside them', () => {
    expect(canUsePath(orders, '/admin/users')).toBe(false);
    expect(canUsePath(orders, '/admin/settings')).toBe(false);
    expect(canUsePath(orders, '/admin/products/new')).toBe(false);
  });

  it('does not let a lookalike path through', () => {
    // /admin/users-and-things is not the users screen, so it is unknown, and
    // unknown is admin-only.
    expect(canUsePath(editor(['users']), '/admin/users-and-things')).toBe(false);
    expect(canUsePath(editor(['users']), '/admin/users')).toBe(true);
  });

  it('leaves an unknown screen to a full admin', () => {
    expect(canUsePath(admin, '/admin/anything-new')).toBe(true);
    expect(canUsePath(editor(['orders']), '/admin/anything-new')).toBe(false);
  });
});

describe('where someone lands', () => {
  it('opens the first area they have', () => {
    expect(landingPath(editor(['content']))).toBe('/admin/pages');
    expect(landingPath(editor(['users']))).toBe('/admin/users');
  });

  it('sends an admin to the first area there is', () => {
    expect(landingPath(admin)).toBe(AREAS[0].paths[0]);
  });

  it('always has somewhere to send them', () => {
    expect(landingPath(editor([]))).toBe('/admin/store-orders');
  });
});

describe('the areas themselves', () => {
  it('give every area a screen to open and something to show', () => {
    for (const area of AREAS) {
      expect(area.paths.length, area.key).toBeGreaterThan(0);
      expect(area.resources.length, area.key).toBeGreaterThan(0);
    }
  });

  it('never put one resource in two areas', () => {
    // A resource in two areas would mean a screen someone can open whose
    // data they cannot save.
    const all = AREAS.flatMap((a) => a.resources);
    expect(all).toHaveLength(new Set(all).size);
  });

  it('never put one screen in two areas', () => {
    const all = AREAS.flatMap((a) => a.paths);
    expect(all).toHaveLength(new Set(all).size);
  });
});
