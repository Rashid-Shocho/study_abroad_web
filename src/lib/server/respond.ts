import { NextResponse } from 'next/server';
import { cookieOptions, type CookieWrite } from '../session';
import { ApiError } from './api';

export function withCookies(res: NextResponse, writes: CookieWrite[]): NextResponse {
  for (const c of writes) {
    res.cookies.set(c.name, c.value, cookieOptions(c));
  }
  // Tokens in Set-Cookie: never stored by a cache or proxy.
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}

/** The API's error, passed on to the browser as {error, code, ...extra}. */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ ...e.data, error: e.message, code: e.code }, { status: e.status || 502 });
  }
  return NextResponse.json({ error: 'Something went wrong. Please try again.', code: 'server_error' }, { status: 500 });
}
