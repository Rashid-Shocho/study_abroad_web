import type { Metadata } from 'next';
import s from '@/components/abroad.module.css';
import { EmptyState, SectionHead, StatusTag, TopBar } from '@/components/bits';
import { Card, cx, Icon, PrimaryButton } from '@/components/ui';
import { dateTime, list, obj, SIDE_STATES, STATUS_STEPS, stepIndex, str, type Raw } from '@/lib/abroad';
import { read } from '@/lib/server/abroad';

export const metadata: Metadata = { title: 'Application' };

/** nexted_applications_screen.dart · one application, with its status tracker. */
export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await read<Raw>(`/v1/nexted/applications/${encodeURIComponent(id)}`);
  const app = obj(r.data?.application);
  const status = str(app.status);
  const step = stepIndex(status);
  const side = SIDE_STATES.some((x) => x.toLowerCase() === status.trim().toLowerCase());
  const ref = str(app.reference) || str(app.id);

  // When each step happened, from the application's history.
  const history = new Map<string, string>();
  for (const h of list(app.history)) {
    const at = str(h.at) || str(h.changedAt);
    if (at && str(h.status)) history.set(str(h.status).toLowerCase(), at);
  }

  return (
    <div className={s.narrow}>
      <TopBar title={str(app.title) || 'Application'} subtitle={ref || undefined} back="/app/applications" />
      {r.error ? (
        <Card>
          <EmptyState icon="cloud_off" title="Couldn’t load this application" action={<PrimaryButton href={`/app/applications/${encodeURIComponent(id)}`}>Try again</PrimaryButton>}>
            {r.error}
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card radius={24}>
            <div className={s.stack} style={{ gap: 8 }}>
              <div className={s.row}>
                <p className={cx(s.muted, s.grow)} style={{ fontSize: 13 }}>
                  {str(app.provider) || 'Your application'}
                </p>
                <StatusTag status={status} />
              </div>
              {step >= 0 && (
                <p className={s.cardTitle} style={{ fontSize: 15 }}>
                  Step {step + 1} of {STATUS_STEPS.length}
                </p>
              )}
              {side && <p className={s.soft} style={{ fontSize: 13 }}>Your counsellor will contact you about this.</p>}
            </div>
          </Card>

          <SectionHead title="Progress" />
          <Card radius={24}>
            <div className={s.track}>
              {STATUS_STEPS.map((label, i) => {
                const done = step >= 0 && i < step;
                const now = step === i;
                const last = i === STATUS_STEPS.length - 1;
                const at = history.get(label.toLowerCase());
                return (
                  <div key={label} className={s.tStep}>
                    <div className={s.tRail}>
                      <span className={cx(s.tDot, done && s.tDotDone, now && s.tDotNow)}>{done && <Icon name="check" size={10} />}</span>
                      {!last && <span className={cx(s.tLine, done && s.tLineDone)} />}
                    </div>
                    <div className={s.tBody} style={last ? { paddingBottom: 0 } : undefined}>
                      <span className={cx(s.tLabel, (done || now) && s.tLabelOn, now && s.tLabelNow)}>{label}</span>
                      {at && <span className={s.fine}>{dateTime(at)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <p className={s.note}>NextED staff move these steps from the web platform. You’ll get a notification each time something changes.</p>
        </>
      )}
    </div>
  );
}
