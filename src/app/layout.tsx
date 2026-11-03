import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Outfit } from 'next/font/google';
import type { ReactNode } from 'react';
import { themeBootScript } from '@/lib/theme';
import './globals.css';

// The app's typeface (google_fonts: Outfit).
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

const siteUrl = process.env.SITE_URL || 'http://localhost:3100';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'nextED Study Abroad: courses, scholarships and applications in one place',
    template: '%s · nextED Study Abroad',
  },
  description:
    'Plan your study abroad with nextED: one profile, your documents, an AI counsellor, course matching, a scholarship finder and applications you can follow step by step.',
  applicationName: 'nextED Study Abroad',
  // The nextED favicon, the same on all three sites (64 px tab icon, 180 px home-screen icon).
  icons: { icon: { url: '/branding/nexted-icon-64.png', sizes: '64x64', type: 'image/png' }, apple: { url: '/branding/nexted-icon-180.png', sizes: '180x180' } },
  openGraph: {
    type: 'website',
    siteName: 'nextED Study Abroad',
    images: ['/mascot/nexi_grad.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf5f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0f1a' },
  ],
};

/**
 * Runs before the first paint:
 *  1. applies the Day / Night choice shared by all nextED websites (lib/theme.ts);
 *  2. shows the loading screen on the first page of a browser session only
 *     (later pages open straight away), and hides it once the page has loaded
 *     (at least 0.6 s so the logo animation reads, never more than 2.5 s).
 */
const bootScript = `${themeBootScript}(function(){var d=document.documentElement;
var first=true;try{first=!sessionStorage.getItem('sa_seen');sessionStorage.setItem('sa_seen','1')}catch(e){}
if(!first)return;d.setAttribute('data-splash','on');var t0=Date.now(),done=false;
function hide(){if(done)return;done=true;setTimeout(function(){d.setAttribute('data-splash','done');setTimeout(function(){d.removeAttribute('data-splash')},600)},Math.max(0,600-(Date.now()-t0)))}
if(document.readyState==='complete')hide();else addEventListener('load',hide);setTimeout(hide,2500)})()`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  // This page's CSP nonce (src/middleware.ts): the boot script runs only with it.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        {/* Browsers hide a nonce once read, so the client sees "": not a real mismatch. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bootScript }} />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=block"
        />
        {/* Country flags: Windows has no flag emojis, so they come from Noto Color Emoji (only the flag glyphs download). */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap" />
      </head>
      <body>
        {/* Loading screen (globals.css › #nx-splash), as on the IELTS AI website. Hidden unless the boot script turns it on. */}
        <div id="nx-splash" aria-hidden="true">
          <div className="sp-inner">
            <div className="sp-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/branding/nexted-logo-dark.webp" alt="" className="logo-day" width={220} height={45} fetchPriority="high" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/branding/nexted-logo-light.webp" alt="" className="logo-night" width={220} height={45} fetchPriority="high" />
            </div>
            <div className="sp-product">
              Study <b>Abroad</b>
            </div>
            <div className="sp-bar">
              <i />
            </div>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
