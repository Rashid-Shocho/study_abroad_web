'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Brand, Icon } from '@/components/ui';
import s from './shell.module.css';

/** The main tabs. On a phone "AI services" is one tab that opens its hub. */
const TABS = [
  { href: '/app', icon: 'home', label: 'Home' },
  { href: '/app/guidance', icon: 'explore', label: 'Guidance' },
  { href: '/app/documents', icon: 'description', label: 'Documents' },
  { href: '/app/ai', icon: 'auto_awesome', label: 'AI services' },
  { href: '/app/profile', icon: 'person', label: 'Profile' },
] as const;

/** The AI features, listed under "AI services" in the sidebar. */
const AI = [
  { href: '/app/scholarships', icon: 'workspace_premium', label: 'Scholarship finder' },
  { href: '/app/courses', icon: 'school', label: 'Course finder' },
  { href: '/app/counsellor', icon: 'psychology', label: 'AI Counsellor' },
] as const;

/** Screens opened from Home (they keep the Home tab lit). */
const HOME_AREA = ['/app/applications'];

const under = (path: string, href: string) => path === href || path.startsWith(href + '/');

function isActive(path: string, href: string) {
  if (href === '/app') return path === '/app' || HOME_AREA.some((h) => under(path, h));
  if (href === '/app/ai') return under(path, '/app/ai') || AI.some((a) => under(path, a.href));
  return under(path, href);
}

/** Who is signed in, for the card at the bottom of the sidebar. */
export interface SideUser {
  name: string;
  sub: string;
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** Sidebar footer: the Profile link, then who you are (not a link) and a log-out button. */
function MeCard({ user, on }: { user: SideUser | null; on: boolean }) {
  const [busy, setBusy] = useState(false);
  const name = user?.name || 'Signed in';
  return (
    <div className={s.foot}>
      <Link href="/app/profile" className={`${s.sideTab} ${on ? s.sideActive : ''}`} aria-current={on ? 'page' : undefined}>
        <Icon name="person" size={22} filled={on} />
        Profile
      </Link>
      <div className={s.me}>
        <span className={s.avatar} aria-hidden>
          {initials(name)}
        </span>
        <span className={s.meText}>
          <span className={s.meName}>{name}</span>
          {user?.sub && <span className={s.meSub}>{user.sub}</span>}
        </span>
        <button
          type="button"
          className={s.meOut}
          aria-label="Log out"
          title="Log out"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
            window.location.replace('/login');
          }}
        >
          <Icon name="logout" size={18} />
        </button>
      </div>
    </div>
  );
}

/** [upgradeUrl]: the Pro plans page (on IELTS AI; the same account and pass). */
export function Tabs({ user, upgradeUrl }: { user: SideUser | null; upgradeUrl: string }) {
  const path = usePathname() ?? '';
  const link = (t: { href: string; icon: string; label: string }) => {
    const on = isActive(path, t.href);
    return (
      <Link key={t.href} href={t.href} className={`${s.sideTab} ${on ? s.sideActive : ''}`} aria-current={on ? 'page' : undefined}>
        <Icon name={t.icon} size={22} filled={on} />
        {t.label}
      </Link>
    );
  };
  const aiOn = isActive(path, '/app/ai');
  return (
    <>
      <nav className={s.side} aria-label="Main">
        <div className={s.sideBrand}>
          <Brand href="/app" />
        </div>
        {TABS.slice(0, 3).map(link)}

        <div className={s.group}>
          <Link href="/app/ai" className={`${s.groupHead} ${aiOn ? s.groupOn : ''}`} aria-current={path === '/app/ai' ? 'page' : undefined}>
            <Icon name="auto_awesome" size={22} filled={aiOn} />
            AI services
          </Link>
          {AI.map((a) => {
            const on = under(path, a.href);
            return (
              <Link key={a.href} href={a.href} className={`${s.subTab} ${on ? s.subActive : ''}`} aria-current={on ? 'page' : undefined}>
                <Icon name={a.icon} size={19} filled={on} />
                {a.label}
              </Link>
            );
          })}
        </div>

        {/* Profile lives in the card at the bottom; its slot is "Upgrade plan". */}
        <a href={upgradeUrl} className={`${s.sideTab} ${s.upgradeTab}`} target="_blank" rel="noopener noreferrer">
          <span className={s.upgradeIcon}>
            <Icon name="workspace_premium" size={18} filled />
          </span>
          Upgrade plan
        </a>
        <MeCard user={user} on={isActive(path, '/app/profile')} />
      </nav>
      <nav className={s.bar} aria-label="Main">
        {TABS.map((t) => {
          const on = isActive(path, t.href);
          return (
            <Link key={t.href} href={t.href} className={`${s.tab} ${on ? s.active : ''}`} aria-current={on ? 'page' : undefined} title={t.label}>
              <Icon name={t.icon} size={22} filled={on} />
              <span className="visually-hidden">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
