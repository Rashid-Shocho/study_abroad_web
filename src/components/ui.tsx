// The app's building blocks (lib/app/widgets/kit.dart) for the web - the same
// kit as the IELTS AI website, so both nextED sites look the same.

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import s from './ui.module.css';

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/** A Material Symbols icon by name ('home', 'lock' …), like the app's AppIcons. */
export function Icon({ name, size = 22, filled, color, className }: { name: string; size?: number; filled?: boolean; color?: string; className?: string }) {
  return (
    <span aria-hidden className={cx('icon', filled && 'filled', className)} style={{ fontSize: size, color }}>
      {name}
    </span>
  );
}

/** Frosted glass card (AppCard). Pass [href] to make the whole card a link. */
export function Card({
  children,
  href,
  padding,
  radius,
  style,
  className,
}: {
  children: ReactNode;
  href?: string;
  padding?: number | string;
  radius?: number;
  style?: CSSProperties;
  className?: string;
}) {
  const st: CSSProperties = { ...(padding !== undefined ? { padding } : {}), ...(radius ? { borderRadius: radius } : {}), ...style };
  if (href) {
    return (
      <Link href={href} className={cx(s.card, s.cardLink, className)} style={st}>
        {children}
      </Link>
    );
  }
  return (
    <div className={cx(s.card, className)} style={st}>
      {children}
    </div>
  );
}

/** Dark navy card with the peach / blue glow (HeroCard). */
export function HeroCard({ children, padding, radius, className }: { children: ReactNode; padding?: number | string; radius?: number; className?: string }) {
  return (
    <div className={cx(s.hero, className)} style={{ ...(padding !== undefined ? { padding } : {}), ...(radius ? { borderRadius: radius } : {}) }}>
      {children}
    </div>
  );
}

type ButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  block?: boolean;
  dark?: boolean;
  leading?: string;
  trailing?: string;
  height?: number;
  external?: boolean;
};

/** Peach pill button (PrimaryButton); [dark] = the black / peach-on-night one. */
export function PrimaryButton({ children, href, onClick, type = 'button', disabled, block, dark, leading, trailing, height, external }: ButtonProps) {
  const className = cx(s.primary, block && s.block, dark && s.dark);
  const inner = (
    <>
      {leading && <Icon name={leading} size={18} />}
      <span>{children}</span>
      {trailing && <Icon name={trailing} size={18} />}
    </>
  );
  const style = height ? { height } : undefined;
  if (href && !disabled) {
    if (external) {
      return (
        <a href={href} className={className} style={style} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={className} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled} style={style}>
      {inner}
    </button>
  );
}

export function SoftButton({ children, href, onClick, disabled, leading, height, external }: ButtonProps) {
  const inner = (
    <>
      {leading && <Icon name={leading} size={18} />}
      {children}
    </>
  );
  const style = height ? { height } : undefined;
  if (href) {
    if (external) {
      return (
        <a href={href} className={s.soft} style={style} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={s.soft} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={s.soft} onClick={onClick} disabled={disabled} style={style}>
      {inner}
    </button>
  );
}

export function IconCircle({ icon, size = 40, bg, fg }: { icon: string; size?: number; bg?: string; fg?: string }) {
  return (
    <span className={s.iconCircle} style={{ width: size, height: size, background: bg, color: fg }}>
      <Icon name={icon} size={Math.round(size * 0.48)} />
    </span>
  );
}

export function Tag({ children, tone }: { children: ReactNode; tone?: 'primary' | 'peach' }) {
  return <span className={cx(s.tag, tone === 'primary' && s.tagPrimary, tone === 'peach' && s.tagPeach)}>{children}</span>;
}

export function SectionTitle({ children, as: As = 'h2' }: { children: ReactNode; as?: 'h1' | 'h2' | 'h3' }) {
  return <As className={s.sectionTitle}>{children}</As>;
}

export function Notice({ icon, title, children, action }: { icon: string; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.notice} role="status">
      <IconCircle icon={icon} size={38} bg="var(--surface)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className={s.noticeTitle}>{title}</p>
        <p className={s.noticeBody}>{children}</p>
        {action && <div style={{ marginTop: 10 }}>{action}</div>}
      </div>
    </div>
  );
}

export function Spinner() {
  return <span className={s.spinner} role="progressbar" aria-label="Loading" />;
}

export type NexiPose = 'wave' | 'point' | 'thumbs' | 'grad' | 'reading' | 'speaking' | 'writing';

/** Nexi, the mascot (same images as the app). */
export function Nexi({ pose, height, priority }: { pose: NexiPose; height: number; priority?: boolean }) {
  return (
    <Image
      src={`/mascot/nexi_${pose}.png`}
      alt=""
      width={Math.round(height * 0.8)}
      height={height}
      priority={priority}
      style={{ height, width: 'auto', objectFit: 'contain', flex: 'none' }}
    />
  );
}

/**
 * The nextED logo: navy ink in Day, white in Night (switched by CSS), the
 * same 12 KB WebPs as the IELTS AI website.
 */
export function Logo({ height = 26 }: { height?: number }) {
  const width = Math.round((height * 520) / 107);
  return (
    <span className={s.logo} style={{ height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/branding/nexted-logo-dark.webp" alt="nextED" width={width} height={height} className={s.logoDay} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/branding/nexted-logo-light.webp" alt="" aria-hidden width={width} height={height} className={s.logoNight} />
    </span>
  );
}

/**
 * The site's brand, like the IELTS AI website's: the nextED logo with
 * "STUDY ABROAD" spaced out below it ([size] = the logo's height).
 */
export function Brand({ size = 26, href = '/' }: { size?: number; href?: string }) {
  return (
    <Link href={href} className={s.brand} aria-label="nextED Study Abroad, home">
      <Logo height={size} />
      <span className={s.brandProduct} style={{ fontSize: Math.max(8, Math.round(size * 0.36)) }}>
        Study <b>abroad</b>
      </span>
    </Link>
  );
}

/** Across to the IELTS AI website (the app's "IELTS AI" switch pill). */
export function IeltsPill({ href }: { href: string }) {
  return (
    <a href={href} className={s.ieltsPill} target="_blank" rel="noopener noreferrer" title="Practise IELTS on the IELTS AI website">
      <Icon name="menu_book" size={20} filled />
      <span>IELTS AI</span>
    </a>
  );
}

export const uiStyles = s;
