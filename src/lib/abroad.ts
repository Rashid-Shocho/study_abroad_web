// The study-abroad rules and words, exactly as the app has them
// (lib/features/nexted/*.dart and server/src/routes/nexted.ts), so the web
// and the phone say the same thing. Safe on the server and in the browser.

export type Raw = Record<string, unknown>;

export const str = (v: unknown): string => (v == null ? '' : String(v));
export const obj = (v: unknown): Raw => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {});
export const list = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object').map((x) => x as Raw) : []);
export const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/** The fixed steps an application moves through (staff move it; the student follows it). */
export const STATUS_STEPS = [
  'Submitted',
  'Under Review',
  'Documents Requested',
  'Application Lodged with Institution',
  'Conditional Offer',
  'Unconditional Offer',
  'Deposit or Tuition Paid',
  'Admission Letter or CAS/CoE',
  'Visa Preparation',
  'Visa Lodged',
  'Visa Decision',
  'Enrolled',
];

/** Side states outside the line, shown as the status instead. */
export const SIDE_STATES = ['Rejected', 'Waiting List', 'On Hold'];

export function stepIndex(status: string): number {
  const s = status.trim().toLowerCase();
  return STATUS_STEPS.findIndex((x) => x.toLowerCase() === s);
}

/** The profile, in the order the app shows it: key, label, hint. */
export const PROFILE_FIELDS: Array<[string, string, string]> = [
  ['fullName', 'Full name', 'As written in your passport'],
  ['email', 'Email', 'you@example.com'],
  ['phone', 'Phone', '01XXXXXXXXX'],
  ['nationality', 'Nationality', 'Bangladeshi'],
  ['homeDistrict', 'Home district', 'Sylhet · Dhaka · Chattogram …'],
  ['highestLevel', 'Highest education', 'HSC · Bachelor · Master'],
  ['studyLevel', 'Level you want to study', 'Pick one'],
  ['result', 'Result / GPA', 'e.g. 4.50 or 3.2/4'],
  ['ieltsBand', 'IELTS band', 'e.g. 6.5, or "not yet"'],
  ['subject', 'Subject you want to study', 'e.g. Nursing · Data Science · MBA'],
  ['preferredCountry', 'Preferred country', 'UK · Canada · Australia …'],
  ['preferredIntake', 'Preferred intake', 'e.g. September 2027'],
  ['hasPublication', 'Do you have any published research?', 'Pick one'],
];

/** Choices for the level they want to study - fixed words, so the AI reads them reliably. */
export const STUDY_LEVELS = ['Foundation', 'Diploma', 'Bachelors', 'Masters', 'MBA', 'PhD'];

/** What Course matching and the Scholarship finder need (the server checks the same list). */
export const REQUIRED: Array<[string, string]> = [
  ['fullName', 'Full name'],
  ['nationality', 'Nationality'],
  ['highestLevel', 'Highest education'],
  ['result', 'Result / GPA'],
  ['ieltsBand', 'IELTS band'],
  ['studyLevel', 'Level you want to study'],
  ['subject', 'Subject you want to study'],
  ['preferredCountry', 'Preferred country'],
  ['hasPublication', 'Publications'],
];

export const isRequired = (key: string) => REQUIRED.some(([k]) => k === key);

/** Labels of the required fields still empty. */
export function missingFields(profile: Raw): string[] {
  return REQUIRED.filter(([k]) => !str(profile[k]).trim()).map(([, label]) => label);
}

/** What counts towards "complete": every field but the login phone, which is always set. */
const COUNTED = PROFILE_FIELDS.filter(([k]) => k !== 'phone');

export interface Completion {
  /** 0-100, rounded down, so 100 only when nothing is missing. */
  percent: number;
  /** Labels of every empty field, required ones with the same label as missingFields. */
  missing: string[];
}

export function profileCompletion(profile: Raw): Completion {
  const missing = COUNTED.filter(([k]) => !str(profile[k]).trim()).map(
    ([k, label]) => REQUIRED.find(([r]) => r === k)?.[1] ?? label,
  );
  return { percent: Math.floor(((COUNTED.length - missing.length) / COUNTED.length) * 100), missing };
}

/** The document types NextED asks for, in the order they are usually needed: key, label, icon. */
export const DOC_KINDS: Array<[string, string, string]> = [
  ['passport', 'Passport', 'description'],
  ['transcript', 'Academic transcript', 'school'],
  ['certificate', 'Certificate', 'workspace_premium'],
  ['ielts', 'IELTS result', 'bar_chart'],
  ['photo', 'Passport photo', 'photo_camera'],
  ['other', 'Other document', 'attach_file'],
];

/** Which exam a transcript or certificate is for. */
export const DOC_LEVELS: Array<[string, string, string]> = [
  ['ssc', 'SSC', 'Secondary School Certificate (or O Levels)'],
  ['hsc', 'HSC', 'Higher Secondary Certificate (or A Levels)'],
  ['bachelors', 'Bachelor’s', 'Undergraduate degree'],
  ['masters', 'Master’s', 'Postgraduate degree'],
];

export const docLabel = (kind: string) => DOC_KINDS.find(([k]) => k === kind)?.[1] ?? (kind || 'Document');
export const docIcon = (kind: string) => DOC_KINDS.find(([k]) => k === kind)?.[2] ?? 'description';

/** "SSC Transcript", "Bachelor’s Certificate" … */
export function levelName(level: string, kind: string): string {
  const l = DOC_LEVELS.find(([k]) => k === level)?.[1] ?? '';
  const what = kind === 'transcript' ? 'Transcript' : 'Certificate';
  return l ? `${l} ${what}` : docLabel(kind);
}

/** "Pending" reads as "stuck" to a student: it shows as "Awaiting review". */
export function docStatus(status: string): string {
  const s = status.trim();
  return !s || s.toLowerCase() === 'pending' ? 'Awaiting review' : s;
}

export type Tone = 'success' | 'danger' | 'accent' | 'alert' | 'soft';

/** Tone for a document or application status. */
export function statusTone(status: string): Tone {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'verified':
    case 'accepted':
    case 'enrolled':
      return 'success';
    case 'rejected':
    case 'failed':
      return 'danger';
    case 'uploading':
    case 'pending':
    case 'submitted':
    case 'under review':
    case 'awaiting review':
      return 'accent';
    default:
      return 'soft';
  }
}

/** Eligible / Borderline / Not eligible. */
export function verdictOf(v: string): { text: string; tone: Tone } {
  const s = v.trim().toLowerCase();
  if (s === 'eligible') return { text: 'Eligible', tone: 'success' };
  if (s === 'borderline') return { text: 'Borderline', tone: 'alert' };
  if (s === 'not eligible' || s === 'not_eligible' || s === 'ineligible') return { text: 'Not eligible', tone: 'danger' };
  return { text: v || 'Unknown', tone: 'soft' };
}

/** The countries nextED sends students to: flag, short label, full name. */
export const DESTINATIONS: Array<[string, string, string]> = [
  ['🇨🇦', 'Canada', 'Canada'],
  ['🇦🇺', 'Australia', 'Australia'],
  ['🇳🇿', 'New Zealand', 'New Zealand'],
  ['🇸🇪', 'Sweden', 'Sweden'],
  ['🇩🇰', 'Denmark', 'Denmark'],
  ['🇫🇮', 'Finland', 'Finland'],
  ['🇳🇱', 'Netherlands', 'the Netherlands'],
  ['🇧🇪', 'Belgium', 'Belgium'],
  ['🇩🇪', 'Germany', 'Germany'],
  ['🇫🇷', 'France', 'France'],
  ['🇮🇹', 'Italy', 'Italy'],
  ['🇱🇻', 'Latvia', 'Latvia'],
  ['🇱🇹', 'Lithuania', 'Lithuania'],
  ['🇭🇺', 'Hungary', 'Hungary'],
  ['🇬🇷', 'Greece', 'Greece'],
  ['🇵🇱', 'Poland', 'Poland'],
  ['🇪🇪', 'Estonia', 'Estonia'],
  ['🇭🇷', 'Croatia', 'Croatia'],
  ['🇨🇿', 'Czech Rep.', 'the Czech Republic'],
  ['🇰🇷', 'South Korea', 'South Korea'],
  ['🇦🇹', 'Austria', 'Austria'],
  ['🇳🇴', 'Norway', 'Norway'],
  ['🇨🇭', 'Switzerland', 'Switzerland'],
  ['🇨🇳', 'China', 'China'],
  ['🇯🇵', 'Japan', 'Japan'],
  ['🇮🇪', 'Ireland', 'Ireland'],
  ['🇪🇸', 'Spain', 'Spain'],
  ['🇬🇧', 'UK', 'the United Kingdom'],
  ['🇺🇸', 'USA', 'the United States'],
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "just now", "5 min ago", "3 days ago", "24 Oct". */
export function timeAgo(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? '1 hour ago' : `${h} hours ago`;
  const d = Math.round(h / 24);
  if (d < 7) return d === 1 ? 'yesterday' : `${d} days ago`;
  return shortDate(iso);
}

/** "24 Oct" (Dhaka time). */
export function shortDate(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t + 6 * 3600_000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "24 Oct, 3:05 pm" (Dhaka time). */
export function dateTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t + 6 * 3600_000);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

/** "Your last search · 24 Oct - "nursing". Search again to refresh it." */
export function savedLabel(savedAtIso: string, query: string): string {
  const when = savedAtIso ? ` · ${shortDate(savedAtIso)}` : '';
  const what = query.trim() ? `"${query.trim()}"` : 'matched to your profile';
  return `Your last search${when} - ${what}. Search again to refresh it.`;
}

export interface Usage {
  used: number;
  limit: number;
  resetsAt: string;
}

/** `usage` from any AI response (or the usage endpoint), or null. */
export function usageOf(source: unknown): Usage | null {
  const m = obj(source);
  const u = Object.keys(obj(m.usage)).length ? obj(m.usage) : m;
  if (!('used' in u) && !('limit' in u)) return null;
  return { used: Number(u.used) || 0, limit: Number(u.limit) || 0, resetsAt: str(u.resetsAt) };
}

export const LIMIT_MESSAGE = 'You have reached today’s AI limit. It resets at midnight.';

export const isLimitCode = (code: string, status?: number) =>
  code === 'ai_limit_reached' || code === 'ai_quota_exceeded' || status === 429;
