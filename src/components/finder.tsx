'use client';

// Course matching (nexted_courses_screen.dart) and the Scholarship finder
// (nexted_scholarships_screen.dart). Profile in, ranked list out. The
// catalogue, the restrictions and the eligibility verdict are decided on the
// server; the AI only explains them.

import { useEffect, useState } from 'react';
import { LIMIT_MESSAGE, list, obj, savedLabel, str, strings, type Completion, type Raw, type Usage } from '@/lib/abroad';
import s from './abroad.module.css';
import { Answer, EmptyState, Info, ProfileProgress, ProgressBar, SectionHead, SourceRow, TopBar, VerdictTag } from './bits';
import { applyUsage, ApplyButton, call, ClientError, QuotaBar, toast, usageExhausted } from './client';
import { Card, Icon, IconCircle, Nexi, PrimaryButton } from './ui';

type Kind = 'courses' | 'scholarships';

const TEXT = {
  courses: {
    title: 'Course matching',
    subtitle: 'Ranked for your profile',
    hint: 'Narrow it down - subject, country, budget (optional)',
    button: 'Match courses to my profile',
    busy: 'Matching…',
    icon: 'school',
    feature: 'courses',
    errorTitle: 'Couldn’t match courses',
    startTitle: 'Find courses that fit you',
    start: 'Your profile - level, result, IELTS band and where you want to study - decides the ranking. Add a subject or country above to narrow it.',
    emptyTitle: 'No matching courses yet',
    noCatalogue: 'No courses loaded yet',
    footer: 'Tuition figures are indicative and set by the institution. Your counsellor confirms the exact fee before you pay anything.',
    lines: [
      'We are matching courses with your profile…',
      'Reading your level, result and IELTS band…',
      'Searching universities that teach your subject…',
      'Checking entry requirements against your profile…',
      'Ranking the best fits for you…',
      'Almost there - putting your list together…',
    ],
    pose: 'reading' as const,
  },
  scholarships: {
    title: 'Scholarship finder',
    subtitle: 'With an eligibility verdict',
    hint: 'Country, subject or provider (optional)',
    button: 'Find scholarships for me',
    busy: 'Checking…',
    icon: 'workspace_premium',
    feature: 'scholarships',
    errorTitle: 'Couldn’t check scholarships',
    startTitle: 'See what you qualify for',
    start: 'Each scholarship is checked against your GPA, IELTS band, nationality and level, and comes back Eligible, Borderline or Not eligible.',
    emptyTitle: 'No matching scholarships yet',
    noCatalogue: 'No scholarships loaded yet',
    footer: 'The verdict compares your profile with the criteria each provider has set. Your counsellor confirms before you apply.',
    lines: [
      'We are matching scholarships with your profile…',
      'Working on your profile - GPA, IELTS band and level…',
      'Looking for awards open to students from Bangladesh…',
      'Checking each scholarship’s eligibility rules…',
      'Sorting what you qualify for…',
      'Almost there - putting your list together…',
    ],
    pose: 'grad' as const,
  },
};

export function Finder({
  kind,
  missing: initialMissing,
  completion,
  last,
  usage,
  query: initialQuery,
}: {
  kind: Kind;
  missing: string[];
  completion: Completion;
  last: Raw;
  usage: Usage | null;
  query: string;
}) {
  const t = TEXT[kind];
  const saved = list(last[kind]);
  const [missing, setMissing] = useState(initialMissing);
  const [query, setQuery] = useState(initialQuery || str(last.query));
  const [items, setItems] = useState<Raw[]>(saved);
  const [searched, setSearched] = useState(saved.length > 0);
  const [note, setNote] = useState(saved.length ? str(last.searchNote) : '');
  const [gap, setGap] = useState<Raw>(saved.length ? obj(last.gap) : {});
  const [catalogueEmpty, setCatalogueEmpty] = useState(false);
  const [savedLine, setSavedLine] = useState(saved.length ? savedLabel(str(last.savedAt), str(last.query)) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy || missing.length) return;
    if (usageExhausted()) {
      toast(LIMIT_MESSAGE);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await call('POST', `/nexted/ai/${kind}`, query.trim() ? { query: query.trim() } : {});
      applyUsage(r);
      const got = list(r[kind]).length ? list(r[kind]) : list(r.items);
      setItems(got);
      setCatalogueEmpty(Boolean(r.catalogueEmpty));
      setNote(str(r.searchNote));
      setGap(obj(r.gap));
      setSavedLine('');
      setSearched(true);
    } catch (e) {
      if (e instanceof ClientError && e.code === 'profile_incomplete') {
        // The profile changed somewhere else (the app) or was never checked.
        const m = strings(e.data.missing);
        setMissing(m.length ? m : ['Profile details']);
      } else {
        setSearched(true);
        setError(e instanceof ClientError && e.isLimit ? LIMIT_MESSAGE : e instanceof Error ? e.message : 'Something went wrong.');
      }
    } finally {
      setBusy(false);
    }
  }

  const eligible = kind === 'scholarships' ? items.filter((x) => str(x.verdict).toLowerCase() === 'eligible').length : 0;
  // The server refuses a search while a required field is empty, so the
  // button waits for those; the rest only make the results better.
  const blocked = missing.length > 0;
  // A required field the server reported that this page's copy didn't know about.
  const shown: Completion = { ...completion, missing: [...completion.missing, ...missing.filter((m) => !completion.missing.includes(m))] };

  return (
    <div className={s.narrow}>
      <TopBar title={t.title} subtitle={t.subtitle} back="/app/ai" />
      {(blocked || completion.percent < 100) && (
        <ProfileProgress completion={shown} required={missing}>
          <p className={s.soft} style={{ fontSize: 13 }}>
            {blocked
              ? `Nexi matches ${t.feature} to your level, result, IELTS band, subject and country. Add the parts marked * to search.`
              : `You can search now. Adding the rest makes your ${t.feature} more accurate.`}
          </p>
          <div className={s.end}>
            <PrimaryButton href="/app/profile" leading="edit">
              {blocked ? 'Complete my profile' : 'Edit my profile'}
            </PrimaryButton>
          </div>
        </ProfileProgress>
      )}
      <QuotaBar initial={usage} />
      <form
        className={s.search}
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <Icon name="search" size={20} color="var(--text-muted)" />
        <input placeholder={t.hint} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
      </form>

      {error ? (
        <Card>
          <EmptyState icon={t.icon} title={t.errorTitle} action={<PrimaryButton onClick={() => void run()}>Try again</PrimaryButton>}>
            {error}
          </EmptyState>
        </Card>
      ) : busy ? (
        <Wait lines={t.lines} pose={t.pose} />
      ) : !searched ? (
        <Card>
          <EmptyState icon={t.icon} title={t.startTitle}>
            {t.start}
          </EmptyState>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={t.icon} title={catalogueEmpty ? t.noCatalogue : t.emptyTitle} action={<PrimaryButton href="/app/profile">Edit my profile</PrimaryButton>}>
            {note || 'Try another country or a related subject, or check that your profile shows the subject and level you want.'}
          </EmptyState>
        </Card>
      ) : (
        <>
          {savedLine && (
            <div className={s.row} style={{ gap: 8 }}>
              <Icon name="history" size={16} color="var(--text-muted)" />
              <p className={s.muted}>{savedLine}</p>
            </div>
          )}
          {note && <Info>{note}</Info>}
          {str(gap.message) && (
            <Card radius={22} padding="12px 14px">
              <div className={s.row}>
                <Nexi pose="point" height={64} />
                <div className={s.grow}>
                  <p className={s.cardTitle} style={{ fontSize: 13, fontWeight: 700 }}>
                    Nexi’s tip
                  </p>
                  <p className={s.soft} style={{ fontSize: 13 }}>
                    {str(gap.message)}
                  </p>
                </div>
              </div>
            </Card>
          )}
          <SectionHead
            title={kind === 'courses' ? `${items.length} matches` : `${items.length} checked`}
            subtitle={eligible > 0 ? `${eligible} you qualify for` : undefined}
          />
          {items.map((x, i) => (kind === 'courses' ? <CourseCard key={str(x.id) || i} c={x} /> : <ScholarshipCard key={str(x.id) || i} x={x} />))}
          <p className={s.fine}>{t.footer}</p>
        </>
      )}

      <div className={s.footer}>
        <PrimaryButton block leading="auto_awesome" disabled={busy || blocked} onClick={() => void run()}>
          {busy ? t.busy : blocked ? 'Add the * parts of your profile to search' : t.button}
        </PrimaryButton>
      </div>
    </div>
  );
}

function CourseCard({ c }: { c: Raw }) {
  const raw = Number(c.confidence) || 0;
  const score = raw > 1 ? raw / 100 : raw;
  const line = [str(c.university), str(c.country)].filter(Boolean).join(' · ');
  const facts = [str(c.duration), str(c.intake), str(c.tuition)].filter(Boolean).join(' · ');
  // Decided on the server from NextED's partner rules, never by the AI.
  const restriction = obj(c.restriction);
  const blocked = str(restriction.status) === 'closed';
  const uncertain = str(restriction.status) === 'check';
  return (
    <Card radius={24}>
      <div className={s.result}>
        <div className={s.rowTop}>
          <IconCircle icon="school" size={42} />
          <div className={s.grow}>
            <p className={s.cardTitle}>{str(c.title) || 'Course'}</p>
            {line && <p className={s.muted}>{line}</p>}
          </div>
        </div>
        {score > 0 && (
          <div className={s.score}>
            <ProgressBar value={score} />
            <span>{Math.round(score * 100)}% match</span>
          </div>
        )}
        {facts && <p className={s.facts}>{facts}</p>}
        {str(c.why) && <Answer text={str(c.why)} />}
        <SourceRow label={str(c.sourceLabel)} url={str(c.officialUrl)} note={str(c.tuitionNote) || str(c.deadlineNote)} />
        {/* A restricted course is shown with its reason rather than dropped from the list. */}
        {(blocked || uncertain) && (
          <Info icon={blocked ? 'info' : 'help'} danger={blocked}>
            <div>{str(restriction.message)}</div>
            {str(restriction.detail) && <div className={s.fine}>{str(restriction.detail)}</div>}
          </Info>
        )}
        <div className={s.end}>
          {/* Applying to something closed wastes a student's time and a counsellor's: the
              same request goes to a counsellor as a conversation instead (as in the app). */}
          <ApplyButton type="course" refId={str(c.id)} title={str(c.title)} provider={line} label={blocked ? 'Ask a counsellor' : 'Apply'} />
        </div>
      </div>
    </Card>
  );
}

function ScholarshipCard({ x }: { x: Raw }) {
  const verdict = str(x.verdict);
  const notEligible = verdict.toLowerCase().replace(/_/g, ' ') === 'not eligible';
  const provider = [str(x.provider), str(x.country)].filter(Boolean).join(' · ');
  const meta = [str(x.amount), str(x.deadline) ? `Deadline ${str(x.deadline)}` : ''].filter(Boolean).join(' · ');
  const reasons = strings(x.reasons).slice(0, 3);
  return (
    <Card radius={24}>
      <div className={s.result}>
        <div className={s.rowTop}>
          <div className={s.grow}>
            <p className={s.cardTitle}>{str(x.title) || 'Scholarship'}</p>
            {provider && <p className={s.muted}>{provider}</p>}
          </div>
          <VerdictTag verdict={verdict} />
        </div>
        {meta && <p className={s.facts}>{meta}</p>}
        <SourceRow label={str(x.sourceLabel)} url={str(x.officialUrl)} note={str(x.deadlineNote) || str(x.amountNote)} />
        {reasons.length > 0 && (
          <ul className={s.reasons}>
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        <div className={s.end}>
          <ApplyButton type="scholarship" refId={str(x.id)} title={str(x.title)} provider={provider} label={notEligible ? 'Apply anyway' : 'Apply'} />
        </div>
      </div>
    </Card>
  );
}

/** Nexi and a line that changes every couple of seconds, so a long search reads as work being done. */
function Wait({ lines, pose }: { lines: string[]; pose: 'reading' | 'grad' }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => Math.min(n + 1, lines.length - 1)), 2400);
    return () => window.clearInterval(id);
  }, [lines.length]);
  return (
    <Card radius={24} padding={18}>
      <div className={s.wait}>
        <span className={s.float}>
          <Nexi pose={pose} height={110} />
        </span>
        <p key={i} className={s.waitLine}>
          {lines[i]}
        </p>
        <p className={s.muted}>This can take up to a minute - we check live university pages.</p>
        <span className={s.indeterminate} />
      </div>
    </Card>
  );
}
