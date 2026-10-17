import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/**
 * What a phone uses when the site is saved to a home screen: the name under
 * the icon, the icon itself, and the colours the shell is painted with.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  return {
    name: s.siteName,
    short_name: s.siteName.split(' ')[0] || s.siteName,
    description: s.tagline,
    start_url: '/',
    display: 'standalone',
    // Matches the icon, which keeps the logo's white ground.
    background_color: '#FFFFFF',
    theme_color: '#101114',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      // Android crops this one to whatever shape the launcher uses.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
