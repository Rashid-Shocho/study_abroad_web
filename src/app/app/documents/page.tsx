import type { Metadata } from 'next';
import s from '@/components/abroad.module.css';
import { EmptyState, TopBar } from '@/components/bits';
import { Documents } from '@/components/documents';
import { Card, PrimaryButton } from '@/components/ui';
import { list, type Raw } from '@/lib/abroad';
import { read } from '@/lib/server/abroad';

export const metadata: Metadata = { title: 'Documents' };

export default async function DocumentsPage() {
  const r = await read<Raw>('/v1/nexted/documents');
  return (
    <div className={s.narrow}>
      <TopBar title="Documents" subtitle="Upload once, your counsellor sees it" />
      {r.error ? (
        <Card>
          <EmptyState icon="cloud_off" title="Couldn’t load your documents" action={<PrimaryButton href="/app/documents">Try again</PrimaryButton>}>
            {r.error}
          </EmptyState>
        </Card>
      ) : (
        <Documents docs={list(r.data?.documents)} />
      )}
    </div>
  );
}
