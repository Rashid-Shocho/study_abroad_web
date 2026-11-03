'use client';

// Browser-side helpers for the study-abroad screens: calls through the
// same-origin door (/api/v1/*), the snackbar, today's AI allowance, dialogs
// and Apply.

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { isLimitCode, LIMIT_MESSAGE, obj, str, usageOf, type Raw, type Usage } from '@/lib/abroad';
import { saveTheme, type Theme } from '@/lib/theme';
import s from './abroad.module.css';
import d from './dialog.module.css';
import { Portal } from './portal';
import { cx, Icon, PrimaryButton, SoftButton, uiStyles as u } from './ui';
import { ProgressBar } from './bits';

export class ClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public data: Raw = {},
  ) {
    super(message);
  }
  get isLimit() {
    return isLimitCode(this.code, this.status);
  }
}

const ENDED = new Set(['signed_in_elsewhere', 'device_removed', 'session_ended']);

/** The session is over: to /login with the reason, back here afterwards. */
export function toLogin(code: string) {
  const reason = ENDED.has(code) ? code : 'session_ended';
  const next = window.location.pathname + window.location.search;
  window.location.replace(`/login?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent(next)}`);
}

async function readError(res: Response): Promise<ClientError> {
  const data = obj(await res.json().catch(() => ({})));
  const err = new ClientError(str(data.error) || `Something went wrong (${res.status}).`, res.status, str(data.code), data);
  if (res.status === 401) toLogin(err.code);
  return err;
}

/** JSON call to the API as the signed-in student: `call('GET', '/nexted/profile')`. */
export async function call<T = Raw>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ClientError('Can’t reach the server. Check your connection.', 0, 'network');
  }
  if (!res.ok) throw await readError(res);
  return (await res.json().catch(() => ({}))) as T;
}

/** Raw bytes upload (documents): `?kind=&ext=&name=&level=` on the path. */
export async function upload<T = Raw>(path: string, file: Blob, contentType: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { method: 'POST', headers: { 'Content-Type': contentType }, body: file });
  } catch {
    throw new ClientError('Can’t reach the server. Check your connection.', 0, 'network');
  }
  if (!res.ok) throw await readError(res);
  return (await res.json().catch(() => ({}))) as T;
}

/**
 * POST [body] and read the answer as Server-Sent Events: [onToken] gets each
 * piece as it arrives, the `done` body is returned. An error before the first
 * piece comes back as a normal JSON error; an `error` event part way through
 * is thrown the same way.
 */
export async function stream(path: string, body: unknown, onToken: (t: string) => void): Promise<Raw> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ClientError('Can’t reach the server. Check your connection.', 0, 'network');
  }
  if (!res.ok) throw await readError(res);
  if (!(res.headers.get('content-type') ?? '').includes('text/event-stream') || !res.body) {
    return obj(await res.json().catch(() => ({})));
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buffer = '';
  let done: Raw | null = null;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buffer += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let cut = buffer.indexOf('\n\n');
    while (cut >= 0) {
      const frame = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      cut = buffer.indexOf('\n\n');
      let event = 'message';
      const data: string[] = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      let m: Raw;
      try {
        m = obj(JSON.parse(data.join('\n')));
      } catch {
        continue;
      }
      if (event === 'token') {
        const t = str(m.t);
        if (t) onToken(t);
      } else if (event === 'done') {
        done = m;
      } else if (event === 'error') {
        throw new ClientError(str(m.error ?? m.message) || 'Something went wrong.', 0, str(m.code), m);
      }
    }
  }
  if (!done) throw new ClientError('The answer stopped part way. Please try again.', 0, 'ai_failed');
  return done;
}

// ── snackbar ───────────────────────────────────────────────────────────────

type ToastMsg = { text: string; href?: string; label?: string; id: number };
let toastId = 0;

/** Shows a short message at the bottom (the app's toast / snackbar). */
export function toast(text: string, link?: { href: string; label: string }) {
  window.dispatchEvent(new CustomEvent<ToastMsg>('sa-toast', { detail: { text, href: link?.href, label: link?.label, id: ++toastId } }));
}

export function Toaster() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  useEffect(() => {
    let timer = 0;
    const on = (e: Event) => {
      const m = (e as CustomEvent<ToastMsg>).detail;
      setMsg(m);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMsg((cur) => (cur?.id === m.id ? null : cur)), m.href ? 6000 : 3500);
    };
    window.addEventListener('sa-toast', on);
    return () => {
      window.removeEventListener('sa-toast', on);
      window.clearTimeout(timer);
    };
  }, []);
  if (!msg) return null;
  return (
    <Portal>
      <div className={u.toast} role="status" aria-live="polite">
        <span>{msg.text}</span>
        {msg.href && <Link href={msg.href}>{msg.label ?? 'View'}</Link>}
      </div>
    </Portal>
  );
}

// ── today's AI allowance (NextedUsage) ─────────────────────────────────────
// The cap lives in the backend; this only shows what it says, and refuses
// early so the student doesn't type a long question for nothing.

let currentUsage: Usage | null = null;

export function applyUsage(source: unknown) {
  const next = usageOf(source);
  if (!next) return;
  currentUsage = next;
  window.dispatchEvent(new CustomEvent<Usage>('sa-usage', { detail: next }));
}

export function usageExhausted(): boolean {
  return Boolean(currentUsage && currentUsage.limit > 0 && currentUsage.used >= currentUsage.limit);
}

export function useUsage(initial: Usage | null): Usage | null {
  const [usage, setUsage] = useState<Usage | null>(initial ?? currentUsage);
  useEffect(() => {
    if (initial) currentUsage = initial;
    const on = (e: Event) => setUsage((e as CustomEvent<Usage>).detail);
    window.addEventListener('sa-usage', on);
    return () => window.removeEventListener('sa-usage', on);
  }, [initial]);
  return usage;
}

/** "18 of 30 AI actions left today" above every AI screen. */
export function QuotaBar({ initial }: { initial: Usage | null }) {
  const usage = useUsage(initial);
  if (!usage || usage.limit <= 0) return null;
  const exhausted = usage.used >= usage.limit;
  const left = Math.max(0, usage.limit - usage.used);
  const reset = Date.parse(usage.resetsAt);
  const at = Number.isFinite(reset)
    ? new Date(reset).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })
    : '';
  return (
    <div className={s.info} style={{ alignItems: 'center', background: exhausted ? 'var(--accent-soft)' : undefined, padding: '10px 14px', borderRadius: 18 }}>
      <Icon name={exhausted ? 'hourglass_top' : 'auto_awesome'} size={17} />
      <div className={s.grow} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span>{exhausted ? LIMIT_MESSAGE : `${left} of ${usage.limit} AI actions left today`}</span>
        {!exhausted && <ProgressBar value={usage.used / usage.limit} thin />}
      </div>
      {exhausted && at && <span className={s.muted}>{at}</span>}
    </div>
  );
}

// ── dialogs and sheets ─────────────────────────────────────────────────────

export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <Portal>
      <div className={d.backdrop} onClick={onClose}>
        <div className={d.sheet} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
          <h2 className={d.title}>{title}</h2>
          {children}
        </div>
      </div>
    </Portal>
  );
}

export function Confirm({
  title,
  body,
  yes,
  onYes,
  onClose,
  busy,
}: {
  title: string;
  body: ReactNode;
  yes: string;
  onYes: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog title={title} onClose={onClose}>
      <div className={d.body}>{body}</div>
      <div className={s.dialogRow}>
        <button type="button" className={s.outline} onClick={onClose}>
          Cancel
        </button>
        <PrimaryButton onClick={onYes} disabled={busy} height={48}>
          {busy ? 'Please wait…' : yes}
        </PrimaryButton>
      </div>
    </Dialog>
  );
}

// ── Direct Apply (nexted_apply.dart) ───────────────────────────────────────
// Writes an application and leaves it for NextED staff, who work it and
// move its status. The site never moves a status itself.

export function ApplyButton({
  type,
  refId,
  title,
  provider,
  label = 'Apply',
}: {
  type: 'course' | 'scholarship' | 'university';
  refId: string;
  title: string;
  provider: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const r = await call('POST', '/nexted/applications', { type, refId, title, provider });
      const app = Object.keys(obj(r.application)).length ? obj(r.application) : r;
      const ref = str(app.reference) || str(app.id);
      setOpen(false);
      toast(ref ? `Application sent · ${ref}` : 'Application sent', { href: '/app/applications', label: 'View' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t send it. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SoftButton onClick={() => setOpen(true)} height={38}>
        {label}
      </SoftButton>
      {open && (
        <Confirm
          title="Send this application?"
          yes="Apply"
          busy={busy}
          onYes={send}
          onClose={() => !busy && setOpen(false)}
          body={
            <>
              <p style={{ margin: '0 0 10px', whiteSpace: 'pre-line' }}>{provider ? `${title}\n${provider}` : title}</p>
              <p className={s.muted} style={{ fontSize: 13 }}>
                Your NextED counsellor picks it up and works it for you. You’ll see every step here, and we’ll ask if anything else is needed.
              </p>
            </>
          }
        />
      )}
    </>
  );
}

/** Light / Dark (the app's Day / Night). */
export function AppearanceToggle() {
  const [theme, setTheme] = useState<'day' | 'night' | null>(null);
  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-theme');
    setTheme(attr === 'night' || attr === 'day' ? attr : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day');
  }, []);
  const set = (t: Theme) => {
    // Saved for nexted.app and the IELTS AI website too.
    saveTheme(t);
    setTheme(t);
  };
  return (
    <div className={s.seg} role="radiogroup" aria-label="Appearance">
      {(
        [
          ['day', 'Light'],
          ['night', 'Dark'],
        ] as const
      ).map(([t, label]) => (
        <button key={t} type="button" role="radio" aria-checked={theme === t} className={cx(s.segBtn, theme === t && s.segOn)} onClick={() => set(t)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function LogoutRow({ compact }: { compact?: boolean } = {}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={cx(compact ? s.settingPill : s.setting, s.danger)}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
        window.location.replace('/login');
      }}
    >
      <Icon name="logout" size={compact ? 18 : 22} />
      <span className={compact ? undefined : s.grow}>{busy ? 'Logging out…' : 'Log out'}</span>
    </button>
  );
}
