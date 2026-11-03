// Server-side reads of the study-abroad API (/v1/nexted/*) for pages.
import { redirect } from 'next/navigation';
import { api, ApiError } from './api';

export type Result<T> = { data: T; error: null } | { data: null; error: string };

/** GET [path] as the signed-in student. A finished session goes to /login. */
export async function read<T = Record<string, unknown>>(path: string): Promise<Result<T>> {
  try {
    return { data: await api<T>(path), error: null };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect(`/login?reason=${encodeURIComponent(e.code || 'session_ended')}`);
    return { data: null, error: e instanceof Error ? e.message : 'Something went wrong. Please try again.' };
  }
}

/** Like [read], but an error just gives {} (saved searches, the AI allowance). */
export async function readQuiet<T = Record<string, unknown>>(path: string): Promise<T | Record<string, never>> {
  const r = await read<T>(path);
  return r.data ?? {};
}
