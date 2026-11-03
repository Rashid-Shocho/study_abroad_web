import type { Metadata } from 'next';
import Link from 'next/link';
import s from '@/components/abroad.module.css';
import { EmptyState, ProgressBar, StatusTag, TopBar } from '@/components/bits';
import { Card, Icon, IconCircle, PrimaryButton } from '@/components/ui';
import { list, STATUS_STEPS, stepIndex, str, timeAgo, type Raw } from '@/lib/abroad';
import { read } from '@/lib/server/abroad';

export const metadata: Metadata = { title: 'My applications' };

/** nexted_applications_screen.dart · the list. */
export default async function ApplicationsPage() {
  const r = await read<Raw>('/v1/nexted/applications');
  const items = list(r.data?.applications);
  return (
    <div className={s.narrow}>
      <TopBar title="My applications" subtitle="Your counsellor works these on the web" back="/app" />
      {r.error ? (
        <Card>
          <EmptyState icon="cloud_off" title="Couldn’t load your applications" action={<PrimaryButton href="/app/applications">Try again</PrimaryButton>}>
            {r.error}
          </EmptyState>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="task_alt"
            title="No applications yet"
            action={
              <div className={s.wrap} style={{ justifyContent: 'center' }}>
                <PrimaryButton href="/app/courses">Course matching</PrimaryButton>
                <PrimaryButton href="/app/scholarships" dark>
                  Scholarships
                </PrimaryButton>
              </div>
            }
          >
            Apply from a matched course or scholarship and it appears here, with every step from submitted to enrolled.
          </EmptyState>
        </Card>
      ) : (
        items.map((a) => {
          const status = str(a.status);
          const step = stepIndex(status);
          const ref = str(a.reference) || str(a.id);
          const updated = timeAgo(str(a.updatedAt));
          return (
            <Link key={str(a.id)} href={`/app/applications/${encodeURIComponent(str(a.id))}`} className={s.item} style={{ display: 'block', borderRadius: 24, padding: 16 }}>
              <div className={s.result}>
                <div className={s.rowTop}>
                  <IconCircle icon={str(a.type) === 'scholarship' ? 'workspace_premium' : 'school'} size={42} />
                  <div className={s.grow}>
                    <p className={s.cardTitle}>{str(a.title) || 'Application'}</p>
                    {str(a.provider) && <p className={s.muted}>{str(a.provider)}</p>}
                  </div>
                  <StatusTag status={status} />
                </div>
                {step >= 0 && <ProgressBar value={(step + 1) / STATUS_STEPS.length} />}
                <div className={s.row} style={{ gap: 8 }}>
                  {ref && <span className={s.muted}>{ref}</span>}
                  <span className={s.grow} />
                  {updated && <span className={s.muted}>Updated {updated}</span>}
                  <Icon name="chevron_right" size={18} color="var(--text-muted)" />
                </div>
              </div>
            </Link>
          );
        })
      )}
      <p className={s.note}>Every change your counsellor makes is timestamped and sent to your phone.</p>
    </div>
  );
}
