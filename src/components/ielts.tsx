'use client';

// The IELTS AI pill in each page's title row (laptops). The address comes
// from the server (IELTS_SITE_URL) through the signed-in layout.

import { createContext, useContext, type ReactNode } from 'react';
import { IeltsPill } from './ui';
import s from './abroad.module.css';

const IeltsUrl = createContext('');

export function IeltsProvider({ url, children }: { url: string; children: ReactNode }) {
  return <IeltsUrl.Provider value={url}>{children}</IeltsUrl.Provider>;
}

/** The pill, on the same line as the page title. Phones show it in the top row instead. */
export function HeaderPill() {
  const url = useContext(IeltsUrl);
  if (!url) return null;
  return (
    <span className={s.headerPill}>
      <IeltsPill href={`${url}/app`} />
    </span>
  );
}
