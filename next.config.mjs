/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Pages opened from another site cannot reach back into this one (window.opener).
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Camera: "Take a photo" of a document on a phone.
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(), microphone=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Small self-contained server for Docker / Coolify (.next/standalone).
  output: 'standalone',
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
