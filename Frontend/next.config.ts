import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent NextJS from stripping trailing slashes on rewrites
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      // Proxy API requests to Django backend - with trailing slash
      {
        source: '/api/:path*/',
        destination: 'http://localhost:8000/api/:path*/',
      },
      // Proxy API requests to Django backend - without trailing slash
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
