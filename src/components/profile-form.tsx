'use client';

// The student profile (nexted_profile_screen.dart): the details Course
// matching and the Scholarship finder are built from. Same record a
// counsellor sees. The name is the account's name (changing it here changes
// it in IELTS AI too); the phone is the login number and isn't edited here.
// Two columns on a laptop; Save at the bottom. A saved profile opens as a
// read-only view with "Edit profile"; an empty one opens ready to fill in.

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { isRequired, missingFields, obj, PROFILE_FIELDS, profileCompletion, str, STUDY_LEVELS, type Raw } from '@/lib/abroad';
import s from './abroad.module.css';
import { ProfileProgress, TopBar } from './bits';
import { call, toast } from './client';
import { Card, cx, Icon, PrimaryButton, SoftButton } from './ui';

const valuesOf = (p: Raw) => Object.fromEntries(PROFILE_FIELDS.map(([k]) => [k, str(p[k])]));

/** Filled in by the server, not the student: the account name, login phone and IELTS AI band. */
const AUTO_FIELDS = new Set(['fullName', 'phone', 'ieltsBand']);
/** True once the student has saved anything of their own (the page then opens as a view). */
const hasOwnDetails = (p: Raw) => PROFILE_FIELDS.some(([k]) => !AUTO_FIELDS.has(k) && str(p[k]).trim());
const meta = (key: string) => PROFILE_FIELDS.find(([k]) => k === key) ?? [key, key, ''];

/** The grid, in reading order: three per row on a laptop. */
const GRID = ['fullName', 'email', 'phone', 'nationality', 'homeDistrict', 'highestLevel', 'result', 'ieltsBand', 'subject', 'preferredCountry', 'preferredIntake', 'hasPublication'];

export function ProfileForm({ initial, bandSource: initialSource, settings }: { initial: Raw; bandSource: string; settings: ReactNode }) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, string>>(() => valuesOf(initial));
  // The values as last saved: what the view shows and Cancel goes back to.
  const [saved, setSaved] = useState<Record<string, string>>(() => valuesOf(initial));
  const [editing, setEditing] = useState(() => !hasOwnDetails(initial));
  const [bandSource, setBandSource] = useState(initialSource);
  const [loadedBand, setLoadedBand] = useState(str(initial.ieltsBand));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const completion = profileCompletion(editing ? v : saved);
  const required = missingFields(editing ? v : saved);

  const set = (k: string, val: string) => {
    setV((cur) => ({ ...cur, [k]: val }));
    setDirty(true);
  };

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      // The phone is the login number: never sent from here.
      const body = Object.fromEntries(PROFILE_FIELDS.filter(([k]) => k !== 'phone').map(([k]) => [k, (v[k] ?? '').trim()]));
      const r = await call('PATCH', '/nexted/profile', body);
      const p = obj(r.profile);
      setV(valuesOf(p));
      setSaved(valuesOf(p));
      setBandSource(str(r.ieltsBandSource));
      setLoadedBand(str(p.ieltsBand));
      setDirty(false);
      setEditing(false);
      toast('Profile saved');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /** Where the IELTS band came from, in a few words. */
  const bandNote = (() => {
    const typed = (v.ieltsBand ?? '').trim();
    if (typed !== loadedBand.trim()) return typed ? 'Your own band - it stays as typed.' : 'Empty: follows your IELTS AI band.';
    switch (bandSource) {
      case 'mock':
        return 'From your latest IELTS AI mock test.';
      case 'target':
        return 'Your IELTS AI target band.';
      case 'you':
        return 'Entered by you. Clear it to use IELTS AI’s.';
      default:
        return '';
    }
  })();

  const label = (key: string) => {
    const [, l] = meta(key);
    return isRequired(key) || key === 'hasPublication' || key === 'studyLevel' ? `${l} *` : l;
  };

  const chips = (key: string, options: string[]) => {
    const current = (v[key] ?? '').trim();
    const all = current && !options.some((o) => o.toLowerCase() === current.toLowerCase()) ? [...options, current] : options;
    return (
      <div className={s.chips} role="radiogroup" aria-label={meta(key)[1]}>
        {all.map((o) => {
          const on = current.toLowerCase() === o.toLowerCase();
          return (
            <button key={o} type="button" role="radio" aria-checked={on} className={cx(s.chip, s.chipSm, on && s.chipOn)} onClick={() => set(key, o)}>
              {o}
            </button>
          );
        })}
      </div>
    );
  };

  function cancel() {
    setV(saved);
    setDirty(false);
    setEditing(false);
  }

  /** One saved detail, read-only. */
  const shown = (key: string) => {
    const value = (saved[key] ?? '').trim();
    const name = key === 'hasPublication' ? 'Published research? *' : label(key);
    return (
      <div key={key} className={s.pField}>
        <span className={s.pLabel}>{name}</span>
        <div className={cx(s.pValue, !value && s.pValueEmpty)}>{value || 'Not added yet'}</div>
      </div>
    );
  };

  const field = (key: string) => {
    if (!editing) return shown(key);
    if (key === 'phone') {
      return (
        <div key={key} className={s.pField}>
          <span className={s.pLabel}>{label(key)}</span>
          <div className={s.pLocked} title="Your login number. Change it in your Profile in the app.">
            <span>{v.phone || '–'}</span>
            <Icon name="lock" size={16} color="var(--text-muted)" />
          </div>
        </div>
      );
    }
    if (key === 'hasPublication') {
      return (
        <div key={key} className={s.pField}>
          <span className={s.pLabel} title="A paper in a journal or at a conference, at any level of study.">
            Published research? *
          </span>
          {chips(key, ['Yes', 'No'])}
        </div>
      );
    }
    const [, , hint] = meta(key);
    return (
      <div key={key} className={s.pField}>
        <label className={s.pLabel} htmlFor={`f-${key}`}>
          {label(key)}
        </label>
        <input
          id={`f-${key}`}
          className={s.pInput}
          placeholder={hint}
          value={v[key] ?? ''}
          type={key === 'email' ? 'email' : 'text'}
          inputMode={key === 'result' ? 'decimal' : undefined}
          autoComplete={key === 'fullName' ? 'name' : key === 'email' ? 'email' : 'off'}
          title={key === 'fullName' ? 'The same name as your nextED account - changing it here changes it everywhere.' : undefined}
          onChange={(e) => set(key, e.target.value)}
        />
        {key === 'ieltsBand' && bandNote && <span className={s.pHint}>{bandNote}</span>}
      </div>
    );
  };

  return (
    <form
      className={s.stack}
      style={{ gap: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <TopBar title="Student profile" subtitle="Your counsellor sees the same details" />
      <ProfileProgress completion={completion} required={required} />
      {editing && (
        <div className={s.info} style={{ padding: '9px 14px', alignItems: 'center' }}>
          <Icon name="info" size={18} />
          <span>
            Fields marked * are needed for Course matching and the Scholarship finder. We ask your home district because some universities open or
            close an intake by district.
          </span>
        </div>
      )}

      <Card radius={24} padding="16px 18px">
        <div className={s.pGrid}>
          {GRID.map(field)}
          {editing ? (
            <div className={cx(s.pField, s.pWide)}>
              <span className={s.pLabel}>{label('studyLevel')}</span>
              {chips('studyLevel', STUDY_LEVELS)}
            </div>
          ) : (
            <div className={s.pWide}>{shown('studyLevel')}</div>
          )}
        </div>
      </Card>

      {settings}

      {/* Save / Edit, at the bottom of the page (kept in reach while scrolling).
          Separate keys: the Edit click must not land on the Save (submit) button. */}
      <div className={cx(s.footer, s.saveRow)}>
        {editing ? (
          <>
            <PrimaryButton key="save" type="submit" block disabled={saving} leading="check">
              {saving ? 'Saving…' : 'Save profile'}
            </PrimaryButton>
            {hasOwnDetails(saved) && (
              <SoftButton key="cancel" onClick={cancel} disabled={saving}>
                Cancel
              </SoftButton>
            )}
            {dirty && <span className={s.muted}>Unsaved changes</span>}
          </>
        ) : (
          <PrimaryButton key="edit" block leading="edit" onClick={() => setEditing(true)}>
            Edit profile
          </PrimaryButton>
        )}
      </div>
    </form>
  );
}
