/** Server-only settings (never NEXT_PUBLIC_: nothing here reaches the browser). */
export const env = {
  apiBaseUrl: (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, ''),
  appKey: process.env.APP_KEY || '',
  siteUrl: (process.env.SITE_URL || 'http://localhost:3100').replace(/\/+$/, ''),
  /**
   * The nextED portal (nexted.app, nexted_portal): landing page, log in, sign
   * up, password reset, Terms and Privacy. It shares this site's cookies.
   */
  portalUrl: (process.env.PORTAL_URL || 'http://localhost:3200').replace(/\/+$/, ''),
  /** The IELTS AI website (the "IELTS AI" pill, IELTS practice links). */
  ieltsSiteUrl: (process.env.IELTS_SITE_URL || 'https://ielts.nexted.app').replace(/\/+$/, ''),
};
