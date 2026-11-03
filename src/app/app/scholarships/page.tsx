import type { Metadata } from 'next';
import { Finder } from '@/components/finder';
import { missingFields, obj, profileCompletion, usageOf, type Raw } from '@/lib/abroad';
import { read, readQuiet } from '@/lib/server/abroad';

export const metadata: Metadata = { title: 'Scholarship finder' };

type Search = Promise<{ q?: string }>;

export default async function Page({ searchParams }: { searchParams: Search }) {
  const { q } = await searchParams;
  const [p, last, usage] = await Promise.all([
    read<Raw>('/v1/nexted/profile'),
    readQuiet<Raw>('/v1/nexted/ai/scholarships/last'),
    readQuiet('/v1/nexted/ai/usage'),
  ]);
  // Can't read the profile: don't lock the student out - the server checks again.
  const profile = obj(p.data?.profile);
  const missing = p.data ? missingFields(profile) : [];
  // Unreadable profile: no progress card (100), same as above.
  const completion = p.data ? profileCompletion(profile) : { percent: 100, missing: [] };
  return <Finder kind="scholarships" missing={missing} completion={completion} last={last as Raw} usage={usageOf(usage)} query={(q ?? '').slice(0, 120)} />;
}
