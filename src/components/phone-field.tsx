'use client';

// Phone number with a country picker (every country, searchable). The flag is
// drawn with the Noto Color Emoji font, because Windows has no flag emojis.

import { useEffect, useMemo, useRef, useState } from 'react';
import { countryName, DIAL_CODES, flagEmoji } from '@/lib/countries';
import { Portal } from './portal';
import { Icon, uiStyles as u } from './ui';
import p from './phone-field.module.css';

const KEY = 'sa_country';

export function PhoneField({
  id = 'phone',
  label = 'Phone number',
  value,
  onChange,
  country,
  onCountry,
  error,
  autoComplete = 'tel-national',
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  country: string;
  onCountry: (iso: string) => void;
  error?: string | null;
  autoComplete?: string;
}) {
  const [open, setOpen] = useState(false);
  const code = DIAL_CODES.find(([c]) => c === country)?.[1] ?? '880';

  // The last country picked on this browser.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && DIAL_CODES.some(([c]) => c === saved)) onCountry(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (iso: string) => {
    onCountry(iso);
    try {
      localStorage.setItem(KEY, iso);
    } catch {}
    setOpen(false);
  };

  return (
    <div className={u.field}>
      <label className={u.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <div className={u.inputWrap}>
        <button type="button" className={p.code} onClick={() => setOpen(true)} aria-label={`Country: ${countryName(country)} +${code}. Change`}>
          <span className={p.flag} aria-hidden>
            {flagEmoji(country)}
          </span>
          <span>+{code}</span>
          <Icon name="expand_more" size={18} />
        </button>
        <input
          id={id}
          className={u.input}
          type="text"
          inputMode="tel"
          autoComplete={autoComplete}
          placeholder={country === 'BD' ? '1XXX XXXXXX' : 'Phone number'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingLeft: 10 }}
        />
      </div>
      {error && <span className={u.fieldError}>{error}</span>}
      {open && <CountryPicker current={country} onPick={pick} onClose={() => setOpen(false)} />}
    </div>
  );
}

function CountryPicker({ current, onPick, onClose }: { current: string; onPick: (iso: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const search = useRef<HTMLInputElement>(null);
  const all = useMemo(() => {
    const rows = DIAL_CODES.map(([iso, code]) => ({ iso, code, name: countryName(iso) }));
    const [bd, ...rest] = rows;
    return [bd, ...rest.sort((a, b) => a.name.localeCompare(b.name))];
  }, []);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^\+/, '');
    if (!t) return all;
    return all.filter((r) => r.name.toLowerCase().includes(t) || r.code.startsWith(t) || r.iso.toLowerCase() === t);
  }, [all, q]);

  useEffect(() => {
    search.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  return (
    <Portal>
      <div className={p.backdrop} onClick={onClose}>
        <div className={p.sheet} role="dialog" aria-modal="true" aria-label="Choose your country" onClick={(e) => e.stopPropagation()}>
          <div className={p.head}>
            <h2 className={p.title}>Choose your country</h2>
            <button type="button" className={p.close} onClick={onClose} aria-label="Close">
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className={u.inputWrap} style={{ height: 48, flex: 'none' }}>
            <span className={u.prefix}>
              <Icon name="search" size={18} />
            </span>
            <input ref={search} className={u.input} placeholder="Country or code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search countries" />
          </div>
          <ul className={p.list} role="listbox" aria-label="Countries">
            {shown.map((r) => (
              <li key={r.iso}>
                <button type="button" role="option" aria-selected={r.iso === current} className={`${p.row} ${r.iso === current ? p.on : ''}`} onClick={() => onPick(r.iso)}>
                  <span className={p.flag} aria-hidden>
                    {flagEmoji(r.iso)}
                  </span>
                  <span className={p.name}>{r.name}</span>
                  <span className={p.dial}>+{r.code}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className={p.none}>No country matches “{q}”.</li>}
          </ul>
        </div>
      </div>
    </Portal>
  );
}
