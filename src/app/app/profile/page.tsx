import type { Metadata } from 'next';
import s from '@/components/abroad.module.css';
import { EmptyState, TopBar } from '@/components/bits';
import { AppearanceToggle, LogoutRow } from '@/components/client';
import { ProfileForm } from '@/components/profile-form';
import { Card, Icon, PrimaryButton } from '@/components/ui';
import { obj, str, type Raw } from '@/lib/abroad';
import { read } from '@/lib/server/abroad';
import { env } from '@/lib/server/env';

export const metadata: Metadata = { title: 'Student profile' };

export default async function ProfilePage() {
  const r = await read<Raw>('/v1/nexted/profile');
  const pill = (href: string, icon: string, title: string) => (
    <a href={href} className={s.settingPill} target="_blank" rel="noopener noreferrer">
      <Icon name={icon} size={18} />
      {title}
    </a>
  );
  // Settings in one row under the form, so the page stays on one screen.
  const settings = (
    <div className={s.settingsRow} aria-label="Settings">
      <div className={s.settingPill} style={{ paddingRight: 5, cursor: 'default' }}>
        <Icon name="dark_mode" size={18} />
        Appearance
        <AppearanceToggle />
      </div>
      {pill(`${env.ieltsSiteUrl}/app`, 'school', 'IELTS practice')}
      {pill(`${env.portalUrl}/terms`, 'description', 'Terms')}
      {pill(`${env.portalUrl}/privacy`, 'shield', 'Privacy')}
      <LogoutRow compact />
    </div>
  );
  if (r.error) {
    return (
      <>
        <TopBar title="Student profile" subtitle="Your counsellor sees the same details" />
        <Card>
          <EmptyState icon="person" title="Couldn’t load your profile" action={<PrimaryButton href="/app/profile">Try again</PrimaryButton>}>
            {r.error}
          </EmptyState>
        </Card>
        {settings}
      </>
    );
  }
  return <ProfileForm initial={obj(r.data?.profile)} bandSource={str(r.data?.ieltsBandSource)} settings={settings} />;
}
