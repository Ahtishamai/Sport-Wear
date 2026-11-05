import type { MetadataRoute } from 'next';
import { siteBase } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const base = siteBase();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
