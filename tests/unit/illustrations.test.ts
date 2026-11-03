import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ILLUSTRATED, illustrationFor, isVector } from '@/lib/illustrations';

/**
 * The drawings in public/icons and the list of names that claim them.
 *
 * A name in the list with no file is a broken image on the site; a file with
 * no name in the list is a drawing nothing can ever show. Neither announces
 * itself, so they are checked against each other here.
 */
const FILES = readdirSync('public/icons').filter((f) => f.endsWith('.svg'));
const NAMES = FILES.map((f) => f.replace(/\.svg$/, '')).sort();

describe('the illustrated icons', () => {
  it('are all there', () => {
    expect([...ILLUSTRATED].sort()).toEqual(NAMES);
  });

  it('cover every icon the site actually uses', () => {
    // The names in the blocks today. A block whose icon has no drawing falls
    // back to a line glyph, which would sit oddly beside illustrated ones.
    const inUse = [
      'chat', 'clock', 'check', 'truck', 'art', 'rush', 'factory', 'reorder',
      'target', 'eye', 'gem', 'handshake', 'lightbulb', 'heart', 'users',
      'star', 'palette', 'shirt', 'pencil', 'award', 'shield',
    ];
    const missing = inUse.filter((n) => !illustrationFor(n));
    expect(missing, 'icons used on the site with no drawing').toEqual([]);
  });

  it('point at a file that is there', () => {
    for (const name of ILLUSTRATED) {
      expect(illustrationFor(name)).toBe(`/icons/${name}.svg`);
    }
  });

  it('do not answer for a name that has none', () => {
    expect(illustrationFor('leaf')).toBeNull();
    expect(illustrationFor('')).toBeNull();
    expect(illustrationFor(null)).toBeNull();
    expect(illustrationFor(undefined)).toBeNull();
  });

  it('do not care how the name was typed', () => {
    expect(illustrationFor('  Star ')).toBe('/icons/star.svg');
  });

  it('are vectors, and are known to be', () => {
    expect(isVector('/icons/star.svg')).toBe(true);
    expect(isVector('/uploads/products/photo.jpg')).toBe(false);
    expect(isVector(null)).toBe(false);
  });
});

describe('every drawing', () => {
  const svgs = FILES.map((f) => [f, readFileSync(`public/icons/${f}`, 'utf8')] as const);

  it('is drawn on the same square', () => {
    for (const [file, svg] of svgs) {
      expect(svg, file).toContain('viewBox="0 0 96 96"');
    }
  });

  it('has the same stroke weight, cap and join', () => {
    for (const [file, svg] of svgs) {
      expect(svg, file).toContain('stroke-width="4" stroke-linecap="round" stroke-linejoin="round"');
    }
  });

  it('sits on the white circle with the shadow under it', () => {
    for (const [file, svg] of svgs) {
      expect(svg, file).toContain('<circle cx="48" cy="46" r="38" fill="#ffffff"');
      expect(svg, file).toContain('<ellipse cx="48" cy="88"');
    }
  });

  it('uses the brand and nothing else', () => {
    const allowed = new Set(['#101114', '#ffd100', '#ffffff', '#f1c9a5']);
    for (const [file, svg] of svgs) {
      for (const colour of svg.match(/#[0-9a-f]{3,8}/gi) ?? []) {
        expect(allowed.has(colour.toLowerCase()), `${file} uses ${colour}`).toBe(true);
      }
    }
  });

  it('carries no gradient and no background', () => {
    for (const [file, svg] of svgs) {
      expect(svg, file).not.toMatch(/Gradient/i);
      expect(svg, file).not.toMatch(/<rect[^>]*width="96"[^>]*height="96"/);
    }
  });

  it('says what it is, for a reader who cannot see it', () => {
    for (const [file, svg] of svgs) {
      expect(svg, file).toMatch(/<title>[^<]{4,}<\/title>/);
      expect(svg, file).toContain('role="img"');
    }
  });
});
