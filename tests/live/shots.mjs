/**
 * The bits of the live tests that are about this machine rather than the shop.
 *
 * Screenshots are taken through a headless browser over the debugging port,
 * and where that browser lives differs from one computer to the next — so it
 * is looked for here, in one place, instead of being typed into every script.
 */
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
