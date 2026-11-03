import type { Metadata } from 'next';
import { Chat } from '@/components/chat';
import { list, usageOf, type Raw } from '@/lib/abroad';
import { readQuiet } from '@/lib/server/abroad';

export const metadata: Metadata = { title: 'AI Counsellor' };

export default async function CounsellorPage() {
  // The saved conversation (an older server without one just starts empty).
  const [thread, usage] = await Promise.all([readQuiet<Raw>('/v1/nexted/ai/counsellor/thread'), readQuiet('/v1/nexted/ai/usage')]);
  return <Chat thread={list((thread as Raw).messages)} usage={usageOf(usage)} />;
}
