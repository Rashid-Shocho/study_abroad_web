import type { Metadata } from 'next';
import s from '@/components/abroad.module.css';
import { TopBar } from '@/components/bits';
import { HeroCard, Icon, Nexi, PrimaryButton, SoftButton } from '@/components/ui';
import { env } from '@/lib/server/env';

export const metadata: Metadata = { title: 'Guidance' };

type Go = 'profile' | 'ielts' | 'counsellor' | 'scholarships' | 'documents' | 'applications';

interface Step {
  icon: string;
  title: string;
  summary: string;
  points: string[];
  timing: string;
  action?: string;
  go?: Go;
}

/** The whole road from deciding to flying, in the order it happens (nexted_journey_screen.dart). */
const STEPS: Step[] = [
  {
    icon: 'my_location',
    title: 'Decide what you want',
    summary: 'Country, subject and level - before anything else',
    points: [
      'Pick the level first: Foundation, Diploma, Bachelor’s, Master’s or PhD.',
      'Then the subject - the one your results and your plans actually support.',
      'Then two or three countries, not one. Costs, work rights and visa rules differ a lot.',
    ],
    timing: 'Start 12 to 18 months before you want to begin.',
    action: 'Fill in my profile',
    go: 'profile',
  },
  {
    icon: 'school',
    title: 'Sit IELTS',
    summary: 'Almost every country and university asks for it',
    points: [
      'Find the band your course asks for - overall and for each skill.',
      'Practise until your mock band is there, then book the test.',
      'Results come in a few days. If one skill is short, you can retake just that one at many centres.',
    ],
    timing: 'Allow 2 to 3 months of practice before your test date.',
    action: 'Practise IELTS',
    go: 'ielts',
  },
  {
    icon: 'person',
    title: 'Talk to a counsellor',
    summary: 'What a shortlist is, and why you cannot build one alone',
    points: [
      'A shortlist is 4 to 6 universities: a couple you can reach, a couple that are a stretch, one safe choice.',
      'Which universities accept your board, your result and your district changes every intake - your counsellor knows the current rules.',
      'Your counsellor also checks the deadlines and the scholarships that fit you.',
    ],
    timing: 'One or two sessions, as soon as you know your country and level.',
    action: 'Ask what to do next',
    go: 'counsellor',
  },
  {
    icon: 'account_balance_wallet',
    title: 'Work out the money',
    summary: 'Tuition is only one of four things you pay for',
    points: [
      'Tuition - set by the university, usually paid in part before the visa.',
      'Living costs - most visas ask you to show them in a bank account for a set time.',
      'Visa and health fees, and your flight.',
      'Scholarships and waivers can cut the first one - check them before you apply, not after.',
    ],
    timing: 'Plan this before you apply: bank statements often need months of history.',
    action: 'Find scholarships',
    go: 'scholarships',
  },
  {
    icon: 'description',
    title: 'Get your papers together',
    summary: 'The slowest step, and the only one you can start today',
    points: [
      'Passport - valid well beyond your course end date.',
      'SSC, HSC and degree transcripts and certificates.',
      'IELTS result, CV, and your statement of purpose.',
      'Reference letters from teachers or employers.',
    ],
    timing: 'Start now - attested copies and references take weeks.',
    action: 'Upload documents',
    go: 'documents',
  },
  {
    icon: 'check_circle',
    title: 'Apply, and wait',
    summary: 'From submitted to an unconditional offer',
    points: [
      'Your counsellor submits the applications with you.',
      'A conditional offer means "yes, if" - usually your final results or your IELTS band.',
      'Send what the conditions ask for, then the offer becomes unconditional.',
      'Accept one offer and pay the deposit the university asks for.',
    ],
    timing: 'Usually 2 to 8 weeks per university for a decision.',
    action: 'My applications',
    go: 'applications',
  },
  {
    icon: 'badge',
    title: 'The visa',
    summary: 'A separate process, with its own rules and its own refusals',
    points: [
      'The university sends the letter your visa needs (CAS, CoE, I-20 or similar).',
      'You show the funds, your documents and sometimes attend an interview.',
      'A refusal is often about the money or the reason for study - prepare both carefully.',
    ],
    timing: 'Apply as soon as you have the letter - processing times vary by country.',
    action: 'Ask about the visa',
    go: 'counsellor',
  },
  {
    icon: 'flight_takeoff',
    title: 'Before you fly',
    summary: 'The last four weeks',
    points: [
      'Book your flight and your first accommodation.',
      'Carry your passport, visa, offer letter and key documents in your hand luggage.',
      'Arrange some money for the first weeks and register with the university when you arrive.',
    ],
    timing: 'The last month before your course starts.',
  },
];

export default function GuidancePage() {
  const href = (go: Go) =>
    ({
      profile: '/app/profile',
      ielts: `${env.ieltsSiteUrl}/app`,
      counsellor: '/app/counsellor',
      scholarships: '/app/scholarships',
      documents: '/app/documents',
      applications: '/app/applications',
    })[go];

  return (
    <div className={s.narrow}>
      <TopBar title="Guidance" subtitle="Everything, in the order it happens" />

      <HeroCard radius={28} padding="18px 18px 18px 20px">
        <div className={s.heroRow}>
          <div className={s.heroText}>
            <h2 className={s.heroTitle}>From deciding to flying</h2>
            <p className={s.heroSub}>Eight steps, in the order they happen</p>
          </div>
          <span className={s.float}>
            <Nexi pose="point" height={96} priority />
          </span>
        </div>
      </HeroCard>

      {STEPS.map((st, i) => (
        <details key={st.title} className={s.gStep} open={i === 0}>
          <summary>
            <span className={s.gNum}>{i + 1}</span>
            <span className={s.itemText}>
              <span className={s.itemTitle} style={{ whiteSpace: 'normal' }}>
                {st.title}
              </span>
              <span className={s.itemSub}>{st.summary}</span>
            </span>
            <Icon name="expand_more" size={22} className={s.gChevron} />
          </summary>
          <div className={s.gBody}>
            <ul className={s.points}>
              {st.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className={s.timing}>
              <Icon name="schedule" size={16} />
              <span>{st.timing}</span>
            </div>
            {st.action && st.go && (
              <div>
                <SoftButton href={href(st.go)} external={st.go === 'ielts'} height={38} leading={st.icon}>
                  {st.action}
                </SoftButton>
              </div>
            )}
          </div>
        </details>
      ))}

      <HeroCard radius={24} padding={18}>
        <div className={s.heroRow}>
          <div className={s.heroText}>
            <p className={s.heroSub} style={{ color: 'var(--hero-text)' }}>
              Where you are on this road depends on your profile, your band and your papers. A nextED counsellor reads all three and tells you
              the next thing to do - not the whole list again.
            </p>
            <div style={{ marginTop: 8 }}>
              <PrimaryButton href="/app/counsellor" trailing="arrow_forward" height={46}>
                Ask what to do next
              </PrimaryButton>
            </div>
          </div>
        </div>
      </HeroCard>

      <p className={s.note}>
        Timings are typical, not promised - a university or a visa office can take longer. Your counsellor gives the real dates for the country and
        intake you choose.
      </p>
    </div>
  );
}
