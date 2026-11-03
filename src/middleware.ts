// Runs before every page and /api request:
//  1. gives this browser a device id (like an app install) in a cookie;
//  2. keeps the session fresh: an access token about to expire is swapped
//     for a new pair with the refresh token, so pages always read a valid one;
//  3. sends visitors without a session to the nextED portal's login (the
//     landing page, log in, sign up, Terms and Privacy all live there), and
//     signed-in visitors from / and /login to /app.

import { NextResponse, type NextRequest } from 'next/server';
import {
  type AuthTokens,
  clearedLegacyCookies,
  clearedSessionCookies,
  clientIpHeaders,
  COOKIE,
  cookieOptions,
  type CookieWrite,
  DEVICE_COOKIE_AGE,
  deviceHeaders,
  ENDED_CODES,
  LEGACY_COOKIE,
  newDeviceId,
  sessionCookies,
} from './lib/session';
import { contentSecurityPolicy } from './lib/csp';
import { env } from './lib/server/env';

/** Pages that live on the nextED portal (same paths there). */
const PORTAL_PAGES = new Set(['/login', '/signup', '/forgot-password', '/terms', '/privacy']);

const API = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
const APP_KEY = process.env.APP_KEY || '';

/** Refresh when the access token has less than this left. */
const REFRESH_MARGIN_MS = 60_000;

async function refresh(refreshToken: string, deviceId: string, req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  try {
    const res = await fetch(`${API}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(APP_KEY ? { 'X-App-Key': APP_KEY } : {}),
        ...deviceHeaders(deviceId, ua),
        ...clientIpHeaders(req.headers),
      },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => ({}))) as Partial<AuthTokens> & { code?: string };
    if (res.ok && data.accessToken && data.refreshToken && data.accessTokenExpiresAt) {
      return { ok: true as const, tokens: data as AuthTokens };
    }
    // 401: the session is over (signed in elsewhere, removed, expired).
    if (res.status === 401) return { ok: false as const, ended: true, code: String(data.code ?? 'session_ended') };
    return { ok: false as const, ended: false, code: String(data.code ?? 'error') };
  } catch {
    // Server unreachable: keep the cookies, the page shows its own error.
    return { ok: false as const, ended: false, code: 'network' };
  }
}

function apply(res: NextResponse, writes: CookieWrite[]) {
  for (const c of writes) {
    res.cookies.set(c.name, c.value, cookieOptions(c));
  }
  // A response that carries tokens must never be stored by a cache or proxy.
  if (writes.some((c) => c.name === COOKIE.access || c.name === COOKIE.refresh)) {
    res.headers.set('Cache-Control', 'private, no-store');
  }
  return res;
}

/**
 * True for a state-changing /api request that did not come from this site's
 * own pages (cross-site request forgery, including from the other
 * *.nexted.app sites, which the browser counts as "same-site"). Browsers send
 * Sec-Fetch-Site; older ones are checked by Origin. A request with neither is
 * not from a browser page, so it cannot borrow the student's cookies.
 */
function forgedRequest(req: NextRequest): boolean {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return false;
  const site = req.headers.get('sec-fetch-site');
  if (site) return site !== 'same-origin' && site !== 'none';
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.headers.get('host');
  } catch {
    return true;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith('/api/') && forgedRequest(req)) {
    return NextResponse.json({ error: 'This request was blocked.', code: 'forbidden' }, { status: 403 });
  }
  const ua = req.headers.get('user-agent') ?? '';
  const writes: CookieWrite[] = [];

  let deviceId = req.cookies.get(COOKIE.device)?.value ?? '';
  if (!/^[a-f0-9]{32}$/.test(deviceId)) {
    // The id from before the sites shared cookies, if any: same browser, same device.
    const old = req.cookies.get(LEGACY_COOKIE.device)?.value ?? '';
    deviceId = /^[a-f0-9]{32}$/.test(old) ? old : newDeviceId();
    writes.push({ name: COOKIE.device, value: deviceId, maxAge: DEVICE_COOKIE_AGE });
  }

  let access = req.cookies.get(COOKIE.access)?.value ?? '';
  const exp = Date.parse(req.cookies.get(COOKIE.accessExp)?.value ?? '');
  let refreshToken = req.cookies.get(COOKIE.refresh)?.value ?? '';
  let keep = req.cookies.get(COOKIE.keep)?.value === '1';
  let ended: string | null = null;

  const isAuthRoute = pathname.startsWith('/api/auth/');

  // A session from before the sites shared cookies is refreshed into the
  // shared cookies below, and then the old ones go.
  const legacyRefresh = req.cookies.get(LEGACY_COOKIE.refresh)?.value ?? '';
  const migrating = Boolean(legacyRefresh) && !access && !refreshToken && !isAuthRoute;
  if (migrating) {
    refreshToken = legacyRefresh;
    keep = req.cookies.get(LEGACY_COOKIE.keep)?.value === '1';
  } else if (!isAuthRoute && Object.values(LEGACY_COOKIE).some((n) => req.cookies.has(n))) {
    writes.push(...clearedLegacyCookies);
  }
  // A page found the session over (signed in on another device, device
  // removed …) and sent the browser to /login?reason=…: drop the cookies
  // here. Server components can't, and with a still-valid access cookie
  // /login would bounce back to /app forever ("too many redirects").
  const endedReason = pathname === '/login' ? req.nextUrl.searchParams.get('reason') ?? '' : '';
  // Any reason means the page found the session over; unknown codes read as
  // "session_ended".
  if (endedReason && (access || refreshToken)) {
    access = '';
    writes.push(...clearedSessionCookies, ...(migrating ? clearedLegacyCookies : []));
    ended = ENDED_CODES.has(endedReason) ? endedReason : 'session_ended';
  } else if (refreshToken && !isAuthRoute && (!access || !Number.isFinite(exp) || exp - Date.now() < REFRESH_MARGIN_MS)) {
    const r = await refresh(refreshToken, deviceId, req);
    if (r.ok) {
      access = r.tokens.accessToken;
      writes.push(...sessionCookies(r.tokens, keep));
    } else if (r.ended) {
      access = '';
      writes.push(...clearedSessionCookies);
      ended = ENDED_CODES.has(r.code) ? r.code : 'session_ended';
    }
    if (migrating && (r.ok || r.ended)) writes.push(...clearedLegacyCookies);
  }

  const signedIn = Boolean(access) && !ended;

  // This site's home is /app; signed in, the login pages lead there too.
  if ((pathname === '/' || pathname === '/login' || pathname === '/signup') && signedIn) {
    return apply(NextResponse.redirect(new URL('/app', req.url)), writes);
  }

  // The landing page, log in, sign up, password reset, Terms and Privacy
  // live on the nextED portal (it shares the cookies): send students there,
  // and back here afterwards. Pages under /app need a session.
  const portalPage = PORTAL_PAGES.has(pathname);
  if (portalPage || pathname === '/' || (pathname.startsWith('/app') && !signedIn)) {
    const url = new URL(portalPage ? pathname : '/login', env.portalUrl);
    if (pathname !== '/terms' && pathname !== '/privacy') {
      const back = portalPage ? req.nextUrl.searchParams.get('next') ?? '' : pathname === '/' ? '/app' : pathname + search;
      // Only paths on this site (no open redirect).
      const next = /^\/(?![\/\\])[\w\-./?=&%#~]*$/.test(back) ? back : '/app';
      url.searchParams.set('next', env.siteUrl + next);
    }
    if (ended) url.searchParams.set('reason', ended);
    return apply(NextResponse.redirect(url), writes);
  }

  const requestHeaders = new Headers(req.headers);
  // A fresh nonce for this page's scripts (lib/csp.ts). Next.js reads it from
  // the request's Content-Security-Policy; the root layout from x-nonce.
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  // Let this request's server code see the new cookies too.
  if (writes.length) {
    const jar = new Map(req.cookies.getAll().map((c) => [c.name, c.value]));
    for (const w of writes) {
      if (w.maxAge === 0) jar.delete(w.name);
      else jar.set(w.name, w.value);
    }
    requestHeaders.set(
      'cookie',
      Array.from(jar, ([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; '),
    );
  }
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  return apply(res, writes);
}

export const config = {
  // Everything except static files and images.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|mascot/|branding/|robots.txt).*)'],
};
