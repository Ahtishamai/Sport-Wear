import { Montserrat } from 'next/font/google';

/**
 * The admin's typeface.
 *
 * The shop front is set in Saira and Poppins; the admin is a working tool
 * rather than a shop window, so it gets Montserrat on its own. Loading it
 * here and applying the class only inside /admin keeps it off every page a
 * customer sees, which would otherwise be a font download for nothing.
 */
export const adminFont = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});
