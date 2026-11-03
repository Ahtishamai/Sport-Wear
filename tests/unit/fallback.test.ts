import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetHeld, heldFor, lastGood } from '@/lib/fallback';

/**
 * The floor under the site's three shared reads. If the settings, the menus
 * or the collection list cannot be read, every page on the site has nothing
 * to draw — so the answer from a minute ago is used instead of failing with
 * it. These checks are about which answer comes back, and about saying so.
 */
beforeEach(() => forgetHeld());

describe('while a read is working', () => {
  it('gives back what was read', async () => {
    const read = lastGood('x', async () => 'fresh', 'default');
    expect(await read()).toBe('fresh');
  });

  it('asks again every time, rather than answering from memory', async () => {
    let n = 0;
    const read = lastGood('x', async () => ++n, 0);
    expect(await read()).toBe(1);
    expect(await read()).toBe(2);
  });

  it('remembers the answer in case it is needed', async () => {
    const read = lastGood('x', async () => 'fresh', 'default');
    await read();
    expect(heldFor('x')).toBe('fresh');
  });
});

describe('when a read fails', () => {
  it('uses the last answer it gave', async () => {
    let fail = false;
    const noise = vi.fn();
    const read = lastGood(
      'x',
      async () => {
        if (fail) throw new Error('pool timeout');
        return 'from the database';
      },
      'the built-in default',
      noise
    );
    expect(await read()).toBe('from the database');
    fail = true;
    expect(await read()).toBe('from the database');
  });

  it('uses the built-in default when there has never been an answer', async () => {
    const read = lastGood('x', async () => { throw new Error('down'); }, 'the built-in default', vi.fn());
    expect(await read()).toBe('the built-in default');
  });

  it('says so, every time', async () => {
    // A site quietly running on its defaults looks like a content problem and
    // gets debugged as one.
    const noise = vi.fn();
    const read = lastGood('settings', async () => { throw new Error('down'); }, 'd', noise);
    await read();
    await read();
    expect(noise).toHaveBeenCalledTimes(2);
    expect(noise.mock.calls[0][0]).toContain('[settings]');
    expect(noise.mock.calls[0][0]).toContain('built-in defaults');
  });

  it('names the last good answer when that is what it used', async () => {
    const noise = vi.fn();
    let fail = false;
    const read = lastGood('nav', async () => { if (fail) throw new Error('down'); return 'menus'; }, 'none', noise);
    await read();
    fail = true;
    await read();
    expect(noise.mock.calls[0][0]).toContain('last good answer');
  });

  it('recovers the moment the read does', async () => {
    let fail = true;
    const read = lastGood('x', async () => { if (fail) throw new Error('down'); return 'back'; }, 'default', vi.fn());
    expect(await read()).toBe('default');
    fail = false;
    expect(await read()).toBe('back');
  });
});

describe('two different questions', () => {
  it('do not answer each other', async () => {
    const noise = vi.fn();
    const settings = lastGood('settings', async () => 'the settings', 'default settings', noise);
    const nav = lastGood('nav', async () => { throw new Error('down'); }, 'no menus', noise);
    await settings();
    expect(await nav()).toBe('no menus');
    expect(heldFor('settings')).toBe('the settings');
  });
});
