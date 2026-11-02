/**
 * Stands in for `next/headers` while tests run.
 *
 * A unit test is not a request, so there are no cookies and no headers to
 * read. Anything that reaches for them has wandered out of what this suite
 * can honestly check, and should be covered by tests/live instead — so these
 * say that rather than returning an empty answer that would quietly pass.
 */
const noRequest = (what: string): never => {
  throw new Error(
    `This test asked for ${what}, but a unit test has no request. Check it in tests/live instead.`
  );
};

export const cookies = () => noRequest('cookies()');
export const headers = () => noRequest('headers()');
export const draftMode = () => noRequest('draftMode()');
