import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/client';
import { IeltsProvider } from '@/components/ielts';
import { SessionWatch } from '@/components/session-watch';
import { Brand, IeltsPill } from '@/components/ui';
import { api } from '@/lib/server/api';
import { env } from '@/lib/server/env';
import s from './shell.module.css';
import { Tabs, type SideUser } from './tabs';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The sidebar's profile card: name and plan (null if /v1/me fails). */
async function sideUser(): Promise<SideUser | null> {
  const me = await api<{ user: { name: string }; usage?: { plan?: string } }>('/v1/me').catch(() => null);
  if (!me) return null;
  return { name: me.user.name, sub: me.usage?.plan === 'pro' ? 'Pro plan' : 'Free plan' };
}

/** Signed-in area (the middleware sends visitors without a session to /login). */
export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className={s.layout}>
      <SessionWatch />
      <Toaster />
      <Tabs user={await sideUser()} upgradeUrl={`${env.ieltsSiteUrl}/app/upgrade`} />
      <main className={s.main}>
        <div className={s.inner}>
          {/* Phones: the logo and IELTS AI on top. Laptops: the logo is in the sidebar
              and IELTS AI sits on each page's title row (HeaderPill). */}
          <div className={s.topRow}>
            <Brand href="/app" size={22} />
            <IeltsPill href={`${env.ieltsSiteUrl}/app`} />
          </div>
          <IeltsProvider url={env.ieltsSiteUrl}>{children}</IeltsProvider>
        </div>
      </main>
    </div>
  );
}
