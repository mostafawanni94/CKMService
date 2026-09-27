import type { NextConfig } from "next";

/**
 * The Django API host used to be hardcoded to http://localhost:8000, so the
 * dashboard could not be pointed at a staging or production API without an
 * source edit. It comes from BACKEND_API_URL now.
 */
const BACKEND_API_URL = (process.env.BACKEND_API_URL || 'http://localhost:8000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  // Django runs with APPEND_SLASH = False, so Next must forward paths verbatim
  // rather than rewriting trailing slashes — otherwise the two disagree and
  // requests bounce between them.
  skipTrailingSlashRedirect: true,

  devIndicators: false,

  // Type-check the app, not the test suite. `next build` runs tsc over
  // everything the tsconfig selects, and the tests import vitest — a
  // devDependency missing from a production install, which failed the build
  // on a file that is never served. tsconfig.json still includes them, so the
  // editor and `npx tsc --noEmit` keep checking tests.
  typescript: {
    tsconfigPath: 'tsconfig.build.json',
  },

  experimental: {
    scrollRestoration: true,
  },

  async rewrites() {
    return [
      { source: '/api/:path*/', destination: `${BACKEND_API_URL}/api/:path*/` },
      { source: '/api/:path*', destination: `${BACKEND_API_URL}/api/:path*` },
      // Media (uploaded documents, work photos) is served by Django too.
      { source: '/media/:path*', destination: `${BACKEND_API_URL}/media/:path*` },
    ];
  },
};

export default nextConfig;
