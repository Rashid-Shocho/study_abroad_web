'use client';

// AI Counsellor (nexted_counsellor_screen.dart): a chat that already knows
// the student's profile. Answers are typed out as they are written, and the
// conversation is kept on the server (same thread as the app). Every
// message is an AI action, so it counts against the daily cap.

import { useEffect, useRef, useState } from 'react';
import { LIMIT_MESSAGE, list, obj, str, type Raw, type Usage } from '@/lib/abroad';
import s from './abroad.module.css';
import { Answer, TopBar } from './bits';
import { applyUsage, call, ClientError, Confirm, QuotaBar, stream, toast, usageExhausted } from './client';
import { Card, cx, Icon, Nexi, PrimaryButton, SoftButton, Spinner } from './ui';

interface Msg {
  id: number;
  mine: boolean;
  text: string;
  failed?: boolean;
  typing?: boolean;
  office?: Raw;
  actions?: Raw[];
}

const STARTERS = [
  'Which countries suit my profile?',
  'What do I need for a UK student visa?',
  'How much will my first year cost?',
  'Is my IELTS band good enough?',
];

const SCREENS: Record<string, { href: string; icon: string; label: string; hint: string }> = {
  course_finder: { href: '/app/courses', icon: 'school', label: 'Course matching', hint: 'Live search of universities, ranked for your profile' },
  scholarship_finder: { href: '/app/scholarships', icon: 'workspace_premium', label: 'Scholarship finder', hint: 'Awards with an eligibility check for you' },
  complete_profile: {
    href: '/app/profile',
    icon: 'person',
    label: 'Complete my profile',
    hint: 'Course matching and the Scholarship finder open once it is complete',
  },
};

let nextId = 1;

export function Chat({ thread, usage }: { thread: Raw[]; usage: Usage | null }) {
  const [messages, setMessages] = useState<Msg[]>(() =>
    thread
      .filter((m) => str(m.content).trim())
      .map((m) => ({
        id: nextId++,
        mine: str(m.role) === 'student',
        text: str(m.content),
        office: obj(obj(m.meta).office),
        actions: list(obj(m.meta).actions),
      })),
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [disclaimer, setDisclaimer] = useState('');
  const [askNew, setAskNew] = useState(false);
  const follow = useRef(true);
  const end = useRef<HTMLDivElement>(null);

  // Keep the newest words in view while typing - unless the student scrolled up to read.
  useEffect(() => {
    const onScroll = () => {
      follow.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (follow.current) end.current?.scrollIntoView({ block: 'end' });
  }, [messages, sending]);

  // Open on the latest message. Next.js scrolls a new page to the top just
  // after it renders, so jump down once that has happened (and again once
  // fonts and images have settled the height).
  useEffect(() => {
    const toEnd = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' as ScrollBehavior });
    const ids = [window.setTimeout(toEnd, 30), window.setTimeout(toEnd, 250), window.setTimeout(toEnd, 700)];
    return () => ids.forEach((i) => window.clearTimeout(i));
  }, []);

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || sending) return;
    if (usageExhausted()) {
      toast(LIMIT_MESSAGE);
      return;
    }
    // The conversation before this message (the new one travels as `message`).
    const history = messages.filter((m) => !m.failed).map((m) => ({ role: m.mine ? 'student' : 'counsellor', content: m.text }));
    setMessages((cur) => [...cur, { id: nextId++, mine: true, text }]);
    setInput('');
    setSending(true);
    follow.current = true;
    const liveId = nextId++;
    let started = false;
    try {
      const body = { message: text, history };
      let r: Raw;
      try {
        r = await stream('/nexted/ai/counsellor/stream', body, (piece) => {
          setMessages((cur) => {
            if (!started) {
              started = true;
              return [...cur, { id: liveId, mine: false, text: piece, typing: true }];
            }
            return cur.map((m) => (m.id === liveId ? { ...m, text: m.text + piece } : m));
          });
        });
      } catch (e) {
        // An API server from before streaming: ask the ordinary way.
        if (!(e instanceof ClientError) || e.status !== 404 || started) throw e;
        r = await call('POST', '/nexted/ai/counsellor', body);
      }
      applyUsage(r);
      const reply = str(r.reply) || str(r.message);
      if (str(r.disclaimer)) setDisclaimer(str(r.disclaimer));
      setMessages((cur) => {
        const finished: Msg = { id: liveId, mine: false, text: '', office: obj(r.office), actions: list(r.actions) };
        const has = cur.some((m) => m.id === liveId);
        const prev = cur.find((m) => m.id === liveId)?.text.trim() ?? '';
        // The final text is the checked one (restrictions, invitation).
        finished.text = reply || prev || 'No answer came back.';
        return has ? cur.map((m) => (m.id === liveId ? finished : m)) : [...cur, finished];
      });
    } catch (e) {
      const limit = e instanceof ClientError && e.isLimit;
      const msg = limit ? LIMIT_MESSAGE : e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setMessages((cur) => [
        // A reply that broke off part way stays, marked as cut short.
        ...cur
          .map((m) => (m.typing ? { ...m, typing: false, text: m.text.trim() ? `${m.text.trimEnd()}\n\n(The answer was cut short.)` : '' } : m))
          .filter((m) => m.mine || m.text.trim()),
        { id: nextId++, mine: false, failed: true, text: msg },
      ]);
      if (limit) call('GET', '/nexted/ai/usage').then(applyUsage, () => undefined);
    } finally {
      setSending(false);
    }
  }

  async function newChat() {
    try {
      await call('DELETE', '/nexted/ai/counsellor/thread');
      setMessages([]);
      setDisclaimer('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t clear the chat.');
    } finally {
      setAskNew(false);
    }
  }

  const typing = messages.some((m) => m.typing);

  return (
    <div className={s.narrow}>
      <TopBar
        title="AI Counsellor"
        subtitle="Knows your profile"
        back="/app/ai"
        actions={
          messages.length > 0 ? (
            <button type="button" className={s.iconBtn} aria-label="New chat" title="New chat" disabled={sending} onClick={() => setAskNew(true)}>
              <Icon name="add" size={22} />
            </button>
          ) : undefined
        }
      />
      <QuotaBar initial={usage} />

      <div className={cx(s.chat, s.chatBox)}>
        {messages.length === 0 && (
          <>
            <Card radius={24}>
              <div className={s.stack} style={{ gap: 8 }}>
                <span className={s.float} style={{ alignSelf: 'flex-start' }}>
                  <Nexi pose="speaking" height={84} />
                </span>
                <p className={s.cardTitle} style={{ fontSize: 16 }}>
                  Ask about courses, countries, costs or visas
                </p>
                <p className={s.muted} style={{ fontSize: 13 }}>
                  Your profile is already with the counsellor, so answers are about your own band, result and plans - no need to repeat them.
                </p>
              </div>
            </Card>
            <h2 className={s.sectionTitle} style={{ fontSize: 15, margin: '4px 4px 0' }}>
              Start with
            </h2>
            {STARTERS.map((q) => (
              <button key={q} type="button" className={s.starter} disabled={sending} onClick={() => void send(q)}>
                <Icon name="lightbulb" size={17} />
                <span>{q}</span>
              </button>
            ))}
          </>
        )}

        {messages.map((m) => (
          <div key={m.id} style={{ display: 'contents' }}>
            <div className={cx(s.bubble, m.mine && s.mine, m.failed && s.failed)}>
              {m.mine ? m.text : <Answer text={m.text} />}
              {m.typing && <span className={s.cursor} aria-hidden />}
            </div>
            {!m.mine && m.actions && <Actions actions={m.actions} />}
            {!m.mine && m.office && Object.keys(m.office).length > 0 && <Office office={m.office} />}
          </div>
        ))}

        {/* "Thinking…" only until the first words arrive; then the bubble types. */}
        {sending && !typing && (
          <div className={s.bubble} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Spinner />
            <span className={s.muted} style={{ fontSize: 13 }}>
              Thinking…
            </span>
          </div>
        )}
        {disclaimer && messages.length > 0 && <p className={cx(s.fine, s.center)}>{disclaimer}</p>}
        <div ref={end} />
      </div>

      <form
        className={s.composer}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          rows={1}
          placeholder="Ask your counsellor anything"
          value={input}
          aria-label="Your message"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="submit" className={s.send} aria-label="Send" title="Send" disabled={sending || !input.trim()}>
          <Icon name="send" size={20} />
        </button>
      </form>

      {askNew && (
        <Confirm
          title="Start a new chat?"
          body="This conversation will be cleared. Your profile and documents stay as they are."
          yes="New chat"
          onYes={() => void newChat()}
          onClose={() => setAskNew(false)}
        />
      )}
    </div>
  );
}

/** Buttons under an answer that open the screen it talks about. */
function Actions({ actions }: { actions: Raw[] }) {
  const shown = actions.map((a) => str(a.type)).filter((t) => SCREENS[t]);
  if (!shown.length) return null;
  const one = shown.length === 1 ? SCREENS[shown[0]] : null;
  return (
    <div className={s.side}>
      <Card radius={20} padding="12px 15px">
        <div className={s.stack} style={{ gap: 8 }}>
          <p className={s.cardTitle} style={{ fontSize: 14, fontWeight: 700 }}>
            {one ? one.label : 'Take the next step'}
          </p>
          <p className={s.muted}>{one ? one.hint : 'Open it right here.'}</p>
          <div className={s.wrap}>
            {shown.map((t) => (
              <PrimaryButton key={t} href={SCREENS[t].href} leading={SCREENS[t].icon} height={38} dark>
                {one ? 'Open' : SCREENS[t].label}
              </PrimaryButton>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/** The NextED office under an answer that needs a person: call or find us. */
function Office({ office }: { office: Raw }) {
  const ok = (link: string, schemes: string[]) => {
    try {
      return schemes.includes(new URL(link).protocol) ? link : '';
    } catch {
      return '';
    }
  };
  const tel = ok(str(office.telLink), ['tel:']);
  const maps = ok(str(office.mapsUrl), ['https:', 'geo:']);
  return (
    <div className={s.side}>
      <Card radius={20} padding="12px 15px">
        <div className={s.stack} style={{ gap: 8 }}>
          <p className={s.cardTitle} style={{ fontSize: 14, fontWeight: 700 }}>
            {str(office.name) || 'NextED office'}
          </p>
          {str(office.address) && <p className={s.muted}>{str(office.address)}</p>}
          <div className={s.wrap}>
            {tel && (
              <a className={s.srcLink} href={tel} style={{ height: 38, padding: '0 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <Icon name="call" size={18} />
                {str(office.phoneDisplay) ? `Call ${str(office.phoneDisplay)}` : 'Call'}
              </a>
            )}
            {maps && (
              <SoftButton href={maps} external leading="open_in_new" height={38}>
                Directions
              </SoftButton>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

