import { describe, expect, it } from 'vitest';
import { areaForResource } from '@/lib/permissions';
import { RESOURCES } from '@/lib/resources';
import { TRASH } from '@/lib/trash';

/**
 * The three lists the admin runs on, checked against each other.
 *
 * Every screen in the panel is driven by a resource in RESOURCES, guarded by
 * an area in AREAS, and deleted through a spec in TRASH. Adding a screen
 * means adding to all three, and forgetting one does not break the screen —
 * it breaks a button on it, weeks later. That is what these catch: the
 * discount codes went live with no trash spec, and deleting a code answered
 * "that cannot be deleted from here" until somebody tried it.
 */
describe('every resource the admin can edit', () => {
  const names = Object.keys(RESOURCES);

  it('exists', () => {
    expect(names.length).toBeGreaterThan(10);
  });

  it('can be deleted, because deleting means moving it to the trash', () => {
    const missing = names.filter((n) => !TRASH[n]);
    expect(missing, 'resources with no trash spec').toEqual([]);
  });

  it('belongs to exactly one area, so somebody is allowed to reach it', () => {
    const homeless = names.filter((n) => !areaForResource(n));
    expect(homeless, 'resources in no area').toEqual([]);
  });

  it('names the same table in both lists', () => {
    // A trash spec on the wrong table would copy one record and delete
    // another.
    const wrong = names
      .filter((n) => TRASH[n] && TRASH[n].model !== RESOURCES[n].model)
      .map((n) => `${n}: ${String(RESOURCES[n].model)} vs ${TRASH[n].model}`);
    expect(wrong, 'resource and trash spec disagree').toEqual([]);
  });

  it('accepts only fields it means to, and orders itself by something', () => {
    for (const [name, cfg] of Object.entries(RESOURCES)) {
      expect(cfg.fields.length, name).toBeGreaterThan(0);
      expect(Object.keys(cfg.defaultOrder).length, name).toBeGreaterThan(0);
      // Only what is listed in `fields` is ever written, so a field named in
      // one of the coercion lists but not in `fields` is silently dead.
      for (const list of ['decimals', 'ints', 'bools', 'jsons', 'dates'] as const) {
        for (const field of cfg[list] ?? []) {
          expect(cfg.fields, `${name}.${list} names ${field}`).toContain(field);
        }
      }
    }
  });
});

describe('every trash spec', () => {
  it('belongs to a resource the admin has', () => {
    const orphans = Object.keys(TRASH).filter((n) => !RESOURCES[n]);
    expect(orphans, 'trash specs for nothing').toEqual([]);
  });
});
