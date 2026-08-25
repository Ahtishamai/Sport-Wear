import type { Metadata, Viewport } from 'next';
import { Saira, Poppins } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { getSettings } from '@/lib/settings';

const saira = Saira({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-saira',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
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
