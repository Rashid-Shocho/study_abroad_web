import s from '@/components/abroad.module.css';
import { Nexi } from '@/components/ui';

/** Shown for the moment a screen fetches its data (Next.js shows it only while loading). */
export default function Loading() {
  return (
    <div className={s.loadingScreen} role="status" aria-live="polite">
      <span className={s.float}>
        <Nexi pose="reading" height={96} priority />
      </span>
      <p className={s.loadingText}>Loading your data…</p>
      <span className={s.indeterminate} />
    </div>
  );
}
