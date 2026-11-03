// Small study-abroad pieces (lib/features/nexted/widgets.dart) that render
// the same on the server and in the browser.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { statusTone, verdictOf, type Completion, type Tone } from '@/lib/abroad';
import s from './abroad.module.css';
import { HeaderPill } from './ielts';
import { cx, Icon } from './ui';

/** Page title with an optional back arrow and buttons (TopBar). */
export function TopBar({ title, subtitle, back, actions }: { title: string; subtitle?: string; back?: string; actions?: ReactNode }) {
  return (
    <header className={s.top}>
      {back && (
        <Link href={back} className={s.back} aria-label="Back" title="Back">
          <Icon name="arrow_back" size={20} />
        </Link>
      )}
      <div className={s.topText}>
        <h1 className={s.h1}>{title}</h1>
        {subtitle && <p className={s.sub}>{subtitle}</p>}
      </div>
      {actions}
      <HeaderPill />
    </header>
  );
}

export function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className={s.sectionHead}>
      <h2 className={s.sectionTitle}>{title}</h2>
      {subtitle && <p className={s.sectionSub}>{subtitle}</p>}
    </div>
  );
}

export function ToneTag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cx(s.tag, tone !== 'soft' && s[`tone_${tone}`])}>{children}</span>;
}

/** "Under review", "Approved" … in the app's pill style. */
export function StatusTag({ status }: { status: string }) {
  const text = status || 'Pending';
  return <ToneTag tone={statusTone(text)}>{text}</ToneTag>;
}

/** Eligible, Borderline or Not eligible. */
export function VerdictTag({ verdict }: { verdict: string }) {
  const v = verdictOf(verdict);
  return <ToneTag tone={v.tone}>{v.text}</ToneTag>;
}

export function ProgressBar({ value, thin }: { value: number; thin?: boolean }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cx(s.bar, thin && s.thin)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={s.barFill} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A grey strip with an icon (the app's surfaceAlt cards). */
export function Info({ icon = 'info', danger, children }: { icon?: string; danger?: boolean; children: ReactNode }) {
  return (
    <div className={cx(s.info, danger && s.infoDanger)}>
      <Icon name={icon} size={18} />
      <div className={s.grow}>{children}</div>
    </div>
  );
}

/** EmptyState: icon, title, a line, and an optional action. */
export function EmptyState({ icon, title, children, action }: { icon: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIcon}>
        <Icon name={icon} size={26} />
      </span>
      <p className={s.emptyTitle}>{title}</p>
      {children && <p className={s.emptyBody}>{children}</p>}
      {action}
    </div>
  );
}

/**
 * Where a course or scholarship fact came from (NextedSourceRow): a small
 * label ("VERIFIED", "FOUND JUST NOW"), a "check this" note, and a link to
 * the official page. Nothing when there is nothing to say.
 */
export function SourceRow({ label, url, note }: { label: string; url: string; note: string }) {
  let safe = '';
  try {
    const u = new URL(url);
    if ((u.protocol === 'https:' || u.protocol === 'http:') && u.hostname) safe = u.toString();
  } catch {}
  if (!label && !safe && !note) return null;
  const verified = label === 'VERIFIED';
  return (
    <div className={s.stack} style={{ gap: 6 }}>
      {note && (
        <div className={s.srcNote}>
          <Icon name="info" size={14} />
          <span>{note}</span>
        </div>
      )}
      {(label || safe) && (
        <div className={s.srcRow}>
          {label && (
            <span className={cx(s.srcLabel, verified && s.srcVerified)}>
              <Icon name={verified ? 'verified' : 'link'} size={12} />
              {label}
            </span>
          )}
          {safe && (
            <a className={s.srcLink} href={safe} target="_blank" rel="noopener noreferrer nofollow">
              Official page
              <Icon name="open_in_new" size={13} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── the AI's answer (NextedAnswer) ─────────────────────────────────────────
// `#` / `##` / `###` headings, short paragraphs, `- ` / `* ` / `1. ` lists and
// **bold** words. Markdown the models add anyway (italics, code ticks, table
// rows, rules) is shown cleanly instead of as symbols.

const NUMBERED = /^(\d{1,2})[.)]\s+/;
const RULE = /^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}/;

function plain(t: string): string {
  return t
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?![\w*])/g, '$1$2')
    .replace(/(^|[^\w_])_(?!\s)([^_\n]+?)_(?![\w_])/g, '$1$2');
}

function inline(t: string): ReactNode[] {
  const out: ReactNode[] = [];
  const bold = /\*\*(.+?)\*\*|__(.+?)__/g;
  let at = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = bold.exec(t))) {
    if (m.index > at) out.push(plain(t.slice(at, m.index)));
    out.push(<strong key={k++}>{plain(m[1] ?? m[2] ?? '')}</strong>);
    at = m.index + m[0].length;
  }
  if (at < t.length) out.push(plain(t.slice(at)));
  return out;
}

export function Answer({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  text
    .replace(/\r/g, '')
    .split('\n')
    .forEach((raw, i) => {
      const t = raw.trim();
      if (!t || RULE.test(t) || TABLE_DIVIDER.test(t)) return;
      if (t.startsWith('### ')) blocks.push(<p key={i} className={s.aH3}>{inline(t.slice(4))}</p>);
      else if (t.startsWith('## ')) blocks.push(<p key={i} className={s.aH2}>{inline(t.slice(3))}</p>);
      else if (t.startsWith('# ')) blocks.push(<p key={i} className={s.aH1}>{inline(t.slice(2))}</p>);
      else if (t.startsWith('- ') || t.startsWith('• ') || t.startsWith('* ')) {
        blocks.push(
          <div key={i} className={s.aLi}>
            <span className={s.aDot} />
            <span>{inline(t.slice(2).trim())}</span>
          </div>,
        );
      } else if (NUMBERED.test(t)) {
        const m = NUMBERED.exec(t)!;
        blocks.push(
          <div key={i} className={s.aLi}>
            <span className={s.aNum}>{m[1]}.</span>
            <span>{inline(t.slice(m[0].length).trim())}</span>
          </div>,
        );
      } else if (t.startsWith('|')) {
        const cells = t
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
          .join('  ·  ');
        if (cells) blocks.push(<p key={i}>{inline(cells)}</p>);
      } else if (t.startsWith('**') && t.endsWith('**') && t.length > 4 && !t.slice(2, -2).includes('**')) {
        // A line that is all bold is a heading the model wrote the other way.
        blocks.push(<p key={i} className={s.aH2}>{plain(t.slice(2, -2))}</p>);
      } else {
        blocks.push(<p key={i}>{inline(t)}</p>);
      }
    });
  if (!blocks.length) return null;
  return <div className={s.answer}>{blocks}</div>;
}

/**
 * "Your profile is 83% complete" with a bar and the parts still empty.
 * [required] = labels the finders can't work without: they get a * and the
 * danger colour. [children] = the note and button under the list.
 */
export function ProfileProgress({ completion, required = [], children }: { completion: Completion; required?: string[]; children?: ReactNode }) {
  const done = completion.percent >= 100;
  return (
    <div className={s.progressCard}>
      <div className={s.row} style={{ gap: 10 }}>
        <Icon name={done ? 'verified' : 'donut_large'} size={20} color={done ? 'var(--success)' : 'var(--fill)'} />
        <p className={s.cardTitle} style={{ flex: 1, fontWeight: 600 }}>
          {done ? 'Your profile is complete' : `Your profile is ${completion.percent}% complete`}
        </p>
        <span className={s.progressPct}>{completion.percent}%</span>
      </div>
      <ProgressBar value={completion.percent / 100} />
      {!done && (
        <>
          <p className={s.muted}>Still to add{required.length ? ' (* needed for matching)' : ''}:</p>
          <div className={s.wrap} style={{ gap: 6 }}>
            {completion.missing.map((m) => {
              const need = required.includes(m);
              return (
                <span key={m} className={cx(s.pill, need && s.pillNeed)}>
                  {need ? `${m} *` : m}
                </span>
              );
            })}
          </div>
        </>
      )}
      {children}
    </div>
  );
}

export const abroadStyles = s;
