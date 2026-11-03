import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState, SectionHead } from '@/components/bits';
import s from '@/components/abroad.module.css';
import { QuotaBar } from '@/components/client';
import { HeaderPill } from '@/components/ielts';
import { Card, cx, HeroCard, Icon, Nexi, PrimaryButton, type NexiPose } from '@/components/ui';
import { DESTINATIONS, list, obj, REQUIRED, str, usageOf, type Raw } from '@/lib/abroad';
import { read, readQuiet } from '@/lib/server/abroad';

export const metadata: Metadata = { title: 'Home' };

/** Study abroad · Home (nexted_hub_screen.dart). */
export default async function HomePage() {
  const [p, docs, apps, usage] = await Promise.all([
    read<Raw>('/v1/nexted/profile'),
    read<Raw>('/v1/nexted/documents'),
    read<Raw>('/v1/nexted/applications'),
    readQuiet('/v1/nexted/ai/usage'),
  ]);
  const error = p.error ?? docs.error ?? apps.error;
  const profile = obj(p.data?.profile);
  const documents = list(docs.data?.documents).length;
  const applications = list(apps.data?.applications).length;
  const live = !error;

  // The same fields the AI finders need, so "complete" here means Course
  // matching and the Scholarship finder will open.
  const total = REQUIRED.length;
  const done = REQUIRED.filter(([k]) => str(profile[k]).trim()).length;
  const profileDone = live && done >= total;
  const step1Done = profileDone && documents > 0;
  const step3Started = live && applications > 0;
  const first = str(profile.fullName).trim().split(/\s+/)[0] ?? '';
  const pct = Math.round((done * 100) / total);

  return (
    <div className={s.homeCol}>
      <header className={s.top}>
        <div className={s.topText}>
          <p className={s.kicker}>Study abroad</p>
          <h1 className={s.name}>{first || 'Your journey'}</h1>
        </div>
        <HeaderPill />
      </header>

      <HeroCard radius={28} padding="18px 18px 18px 20px">
        <div className={s.heroRow}>
          <div className={s.heroText}>
            <h2 className={s.heroTitle}>{first ? `Your future starts here, ${first}` : 'Your future starts here'}</h2>
            <p className={s.heroSub}>
              {live ? 'Finish your profile and we’ll match you with courses and scholarships.' : 'Profile, matches, scholarships and applications – in order.'}
            </p>
          </div>
          <span className={s.float}>
            <Nexi pose="grad" height={104} priority />
          </span>
        </div>
        {live && (
          <div className={s.heroFoot}>
            <div className={s.heroMeter}>
              <div className={s.heroMeterRow}>
                <span>Profile ready</span>
                <b>{pct}%</b>
              </div>
              <div className={s.heroTrack}>
                <div className={s.heroFill} style={{ width: `${pct}%` }} />
              </div>
            </div>
            <PrimaryButton href={profileDone ? '/app/counsellor' : '/app/profile'} trailing="arrow_forward" height={48}>
              {profileDone ? 'Ask the AI counsellor' : 'Complete my profile'}
            </PrimaryButton>
          </div>
        )}
      </HeroCard>

      {error && (
        <Card>
          <EmptyState icon="cloud_off" title="Couldn’t load your file" action={<PrimaryButton href="/app">Try again</PrimaryButton>}>
            {error}
          </EmptyState>
        </Card>
      )}

      <SectionHead title="Your journey" subtitle="Three steps from here to campus" />
      <div className={s.journey}>
        <Step number={1} title="Tell us about you" pose="writing" done={step1Done} active={!step1Done}>
          <Item href="/app/profile" icon="person" title="Student profile" sub="Everything else is matched against this" trail={live ? `${done}/${total}` : undefined} />
          <Item href="/app/documents" icon="description" title="Documents" sub="Upload once – your counsellor uses the same copies" trail={live && documents > 0 ? String(documents) : undefined} />
        </Step>
        <Step number={2} title="Find where you fit" pose="point" done={step3Started} active={step1Done && !step3Started} footer={<QuotaBar initial={usageOf(usage)} />}>
          <Item href="/app/counsellor" icon="psychology" title="AI Counsellor" sub="Countries, costs, visas – it knows your profile" />
          <Item href="/app/courses" icon="school" title="Course matching" sub="Ranked for you, with a score and the reason" />
          <Item href="/app/scholarships" icon="workspace_premium" title="Scholarships" sub="Eligible, borderline or not – and why" />
        </Step>
        <Step number={3} title="Apply and follow it" done={false} active={step3Started} last>
          <Item href="/app/applications" icon="task_alt" title="Applications" sub="Twelve steps from submitted to enrolled" trail={live && applications > 0 ? String(applications) : undefined} />
        </Step>
      </div>

      <SectionHead title="Popular destinations" />
      {/* One line that keeps moving from the first country to the last, then round again. */}
      <div className={s.marquee}>
        <div className={s.marqueeTrack}>
          {[0, 1].map((copy) => (
            <div key={copy} className={s.marqueeSet} aria-hidden={copy === 1 || undefined}>
              {DESTINATIONS.map(([flag, label, full]) => (
                <Link key={label} href={`/app/courses?q=${encodeURIComponent(label)}`} className={s.dest} aria-label={`Courses in ${full}`} tabIndex={copy === 1 ? -1 : undefined}>
                  <span className={`${s.flag} flag-emoji`} aria-hidden>
                    {flag}
                  </span>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className={s.note}>
        Your NextED counsellor works on your applications from the web platform. Everything you add here reaches them straight away.
      </p>
    </div>
  );
}

/** One step of the journey timeline: numbered dot, a line down, its rows. */
function Step({
  number,
  title,
  pose,
  done,
  active,
  last,
  footer,
  children,
}: {
  number: number;
  title: string;
  pose?: NexiPose;
  done: boolean;
  active: boolean;
  last?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={s.jStep}>
      <div className={s.jRail}>
        <span className={cx(s.jDot, done && s.jDotDone, !done && active && s.jDotActive)}>{done ? <Icon name="check" size={16} /> : number}</span>
        {!last && <span className={cx(s.jLine, done && s.jLineDone)} />}
      </div>
      <div className={s.jBody}>
        <div className={s.jHead}>
          <h3 className={s.jTitle}>{title}</h3>
          {/* Nexi walks along with the student: he stands on the step they're on now. */}
          {pose && active && !done && <Nexi pose={pose} height={40} />}
        </div>
        <div className={s.stepCard}>{children}</div>
        {footer}
      </div>
    </div>
  );
}

/** A row inside a journey step: peach tile, title, one line, count or chevron. */
function Item({ href, icon, title, sub, trail }: { href: string; icon: string; title: string; sub: string; trail?: string }) {
  return (
    <Link href={href} className={s.item}>
      <span className={s.tile}>
        <Icon name={icon} size={22} />
      </span>
      <span className={s.itemText}>
        <span className={s.itemTitle}>{title}</span>
        <span className={s.itemSub}>{sub}</span>
      </span>
      {trail ? <span className={s.trail}>{trail}</span> : <Icon name="arrow_forward" size={18} color="var(--text-muted)" />}
    </Link>
  );
}
