import type { Metadata } from 'next';
import Link from 'next/link';
import s from '@/components/abroad.module.css';
import { TopBar } from '@/components/bits';
import { QuotaBar } from '@/components/client';
import { Icon, Nexi } from '@/components/ui';
import { usageOf } from '@/lib/abroad';
import { readQuiet } from '@/lib/server/abroad';

export const metadata: Metadata = { title: 'AI services' };

const SERVICES = [
  { href: '/app/counsellor', icon: 'psychology', title: 'AI Counsellor', sub: 'Countries, costs, visas – it knows your profile', pose: 'speaking' as const },
  { href: '/app/courses', icon: 'school', title: 'Course matching', sub: 'Ranked for you, with a score and the reason', pose: 'reading' as const },
  { href: '/app/scholarships', icon: 'workspace_premium', title: 'Scholarship finder', sub: 'Eligible, borderline or not – and why', pose: 'grad' as const },
];

/** The three AI features in one place (the phone's AI tab). */
export default async function AiPage() {
  const usage = await readQuiet('/v1/nexted/ai/usage');
  return (
    <>
      <TopBar title="AI services" subtitle="Built on your student profile" />
      <QuotaBar initial={usageOf(usage)} />
      <div className={s.aiGrid}>
        {SERVICES.map((x) => (
          <Link key={x.href} href={x.href} className={s.aiCard}>
            <div className={s.row}>
              <span className={s.tile}>
                <Icon name={x.icon} size={22} />
              </span>
              <span className={s.grow} />
              <Nexi pose={x.pose} height={56} />
            </div>
            <span className={s.itemTitle}>{x.title}</span>
            <span className={s.itemSub}>{x.sub}</span>
            <span className={s.aiGo}>
              Open <Icon name="arrow_forward" size={16} />
            </span>
          </Link>
        ))}
      </div>
      <p className={s.note}>Each answer or search counts as one AI action. Your allowance resets at midnight.</p>
    </>
  );
}
