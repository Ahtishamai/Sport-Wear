/**
 * The bits of the live tests that are about this machine rather than the shop.
 *
 * Screenshots are taken through a headless browser over the debugging port,
 * and where that browser lives differs from one computer to the next — so it
 * is looked for here, in one place, instead of being typed into every script.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

/** Where screenshots go: inside the repo, and ignored by git. */
export function shotsDir() {
  const dir = path.join(process.cwd(), 'tests', 'live', '.shots');
  mkdirSync(dir, { recursive: true });
  return dir;
}

const CANDIDATES = [
  process.env.LIVE_TEST_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

/**
 * The browser to drive, or a plain refusal naming what to set.
 *
 * Failing out loud matters here: a missing browser must not look like a shop
 * that has stopped working.
 */
export function findBrowser() {
  for (const c of CANDIDATES) {
    if (c && existsSync(c)) return c;
  }
  throw new Error(
    'No Edge or Chrome found for the screenshot checks. Set LIVE_TEST_BROWSER to one.'
  );
}

/**
 * Closes a browser and everything it started.
 *
 * A browser is a tree of processes — one per tab, per renderer, per GPU — and
 * killing the one we spawned leaves the rest of them running, holding a
 * couple of hundred megabytes each. Enough runs of the checks and the machine
 * is out of memory, which is how this was found.
 */
export function closeBrowser(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      /* no process group; the plain kill below is the best we can do */
    }
  }
  try {
    child.kill();
  } catch {
    /* already gone */
  }
}
