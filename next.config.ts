import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /*
   * Build on one worker.
   *
   * The deploy host caps how many threads a build may start, and Next fans
   * out across every core while collecting page data — which on that host
   * ends as "OS can't spawn worker thread (os error 11)" and a killed build.
   * One worker is slower here and finishes there, which is the trade worth
   * making for a site this size.
   */
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Uploaded media is written after the build, so route it through the app
  // instead of the platform static layer, which may only know about build-time files.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/uploads/:path*", destination: "/api/uploads/:path*" }],
      afterFiles: [],
      fallback: [],
    };
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
