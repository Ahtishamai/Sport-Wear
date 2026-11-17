import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';
import { getSettings } from '@/lib/settings';
import { siteBase } from '@/lib/seo';

/*
 * The fonts live in the repo (src/app/fonts), not on Google.
 *
 * next/font/google downloads them during every build, so a build could only
 * succeed while Google Fonts answered in the shape Next expects — and one
 * deploy failed outright when it did not ("An error occurred in next/font").
 * These are the same Latin files Google serves (via Fontsource, OFL), so the
 * site looks exactly as before, and the build needs no network for them.
 */
const saira = localFont({
  // Variable: covers every weight the site uses (500–900) in one file.
  src: './fonts/saira-latin-wght.woff2',
  weight: '100 900',
  variable: '--font-saira',
  display: 'swap',
});

const poppins = localFont({
  src: [
    { path: './fonts/poppins-latin-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/poppins-latin-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/poppins-latin-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/poppins-latin-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-poppins',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const base = siteBase();
  const chosen = s.favicon?.trim();
  const custom = chosen && chosen !== '/favicon.ico' ? chosen : null;
  return {
    metadataBase: new URL(base),
    title: { default: s.defaultSeoTitle, template: `%s — ${s.siteName}` },
    description: s.defaultSeoDescription,
    applicationName: s.siteName,
    openGraph: {
      type: 'website',
      siteName: s.siteName,
      title: s.defaultSeoTitle,
      description: s.defaultSeoDescription,
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
    /*
     * The tag Search Console looks for, on every page of the site.
     *
     * It is a setting rather than a line of code because the token belongs to
     * whoever holds the Search Console property, and that can change without
     * the site changing. It stays in the head for good: Google rechecks it
     * and drops a property whose tag has disappeared.
     */
    verification: s.googleSiteVerification?.trim()
      ? { google: s.googleSiteVerification.trim() }
      : undefined,
    // The D-S mark, built from the logo by scripts/make-icons.mjs. A favicon
    // set in site settings replaces it, so it can be changed without a deploy.
    icons: custom
      ? { icon: custom, shortcut: custom, apple: custom }
      : {
          icon: [
            { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
            { url: '/icon-96.png', type: 'image/png', sizes: '96x96' },
            { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
            { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
          ],
          shortcut: '/favicon.ico',
          apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
        },
    manifest: '/manifest.webmanifest',
  };
}

export const viewport: Viewport = {
  themeColor: '#101114',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="en" className={`${saira.variable} ${poppins.variable}`}>
      <head>
        <style
          // Bind the next/font CSS variables to the Tailwind theme tokens.
          dangerouslySetInnerHTML={{
            __html: `:root{--font-display:var(--font-saira),system-ui,sans-serif;--font-sans:var(--font-poppins),system-ui,sans-serif}`,
          }}
        />
      </head>
      <body>
        {s.gtmId && (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${s.gtmId}');`}
          </Script>
        )}
        {!s.gtmId && s.ga4Id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${s.ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${s.ga4Id}');`}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
