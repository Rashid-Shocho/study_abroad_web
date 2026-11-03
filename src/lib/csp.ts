// Content Security Policy: what a page may load and run. Scripts need this
// request's nonce (src/middleware.ts makes one per page; Next.js adds it to its
// own scripts, the root layout to the boot script), so a script slipped into a
// page by an attacker does not run. Everything else comes from this site, plus
// Google Fonts. Keep this file the same in all three nextED projects.

export function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    // Dev only: React Refresh evaluates code, and hot reload uses a WebSocket.
    // Cloudflare Turnstile (the portal's "I'm human" check before an SMS code).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ''}`,
    // style={{…}} attributes and next/font's <style> tags.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // data: photos (avatars, chat), blob: recordings played back.
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "worker-src 'self' blob:",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
