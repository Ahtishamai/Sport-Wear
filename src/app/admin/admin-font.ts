import localFont from 'next/font/local';

/**
 * The admin's typeface.
 *
 * The shop front is set in Saira and Poppins; the admin is a working tool
 * rather than a shop window, so it gets Montserrat on its own. Loading it
 * here and applying the class only inside /admin keeps it off every page a
 * customer sees, which would otherwise be a font download for nothing.
 *
 * Served from the repo rather than Google, for the reason in app/layout.tsx:
 * a build must not depend on Google Fonts answering.
 */
export const adminFont = localFont({
  // Variable: covers 400–800, every weight the admin uses, in one file.
  src: '../fonts/montserrat-latin-wght.woff2',
  weight: '100 900',
  variable: '--font-montserrat',
  display: 'swap',
});
