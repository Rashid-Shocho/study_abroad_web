'use client';

// Documents (nexted_documents_screen.dart): pick the type, then the file,
// then upload. Files go to the shared backend (R2), where the counsellor
// working the application sees them. PDF, JPG or PNG, up to 10 MB.

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { DOC_KINDS, DOC_LEVELS, docIcon, docLabel, docStatus, levelName, str, timeAgo, type Raw } from '@/lib/abroad';
import s from './abroad.module.css';
import { EmptyState, SectionHead, StatusTag } from './bits';
import { Dialog, toast, upload } from './client';
import { Card, Icon, IconCircle, PrimaryButton, SoftButton } from './ui';

const MAX_BYTES = 10 * 1024 * 1024;
const EXTS = new Set(['pdf', 'jpg', 'jpeg', 'png']);
const contentType = (ext: string) => (ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg');

/** (file, ext) when it is a PDF, JPG or PNG up to 10 MB; otherwise the student is told why. */
function check(file: File | undefined): { file: File; ext: string } | null {
  if (!file) return null;
  const dot = file.name.lastIndexOf('.');
  let ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '';
  if (!ext) ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : '';
  if (!EXTS.has(ext)) {
    toast('Upload a PDF, JPG or PNG file.');
    return null;
  }
  if (file.size === 0) {
    toast('Couldn’t read that file. Try another one.');
    return null;
  }
  if (file.size > MAX_BYTES) {
    toast('That file is larger than 10 MB. Try a smaller scan or a photo.');
    return null;
  }
  return { file, ext: ext === 'jpeg' ? 'jpg' : ext };
}

type Pending = { mode: 'new'; kind: string; level: string; label: string } | { mode: 'replace'; id: string; name: string };

export function Documents({ docs }: { docs: Raw[] }) {
  const router = useRouter();
  const [step, setStep] = useState<'kind' | 'level' | 'file' | null>(null);
  const [kind, setKind] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const close = () => {
    setStep(null);
    setPending(null);
  };

  async function send(picked: File | undefined) {
    const ok = check(picked);
    const job = pending;
    close();
    if (!ok || !job) return;
    setBusy(true);
    try {
      if (job.mode === 'new') {
        const q = new URLSearchParams({ kind: job.kind, ext: ok.ext, name: job.label, ...(job.level ? { level: job.level } : {}) });
        await upload(`/nexted/documents?${q}`, ok.file, contentType(ok.ext));
        toast(`${job.label} uploaded`);
      } else {
        await upload(`/nexted/documents/${encodeURIComponent(job.id)}/file?ext=${ok.ext}`, ok.file, contentType(ok.ext));
        toast(`${job.name} replaced`);
      }
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {docs.length === 0 ? (
        <Card>
          <EmptyState icon="description" title="No documents yet">
            Add your passport, transcripts and certificates here - PDF, JPG or PNG, up to 10 MB each. They stay with your file, so you never have to
            send them twice.
          </EmptyState>
        </Card>
      ) : (
        <>
          <SectionHead title={`${docs.length} uploaded`} />
          {docs.map((d) => {
            const name = str(d.name) || 'Document';
            const when = timeAgo(str(d.uploadedAt) || str(d.createdAt));
            const url = str(d.url);
            const note = str(d.note);
            return (
              <Card key={str(d.id)} radius={22} padding="12px 14px">
                <div className={s.rowTop}>
                  <IconCircle icon={docIcon(str(d.kind))} size={42} />
                  <div className={s.grow} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <p className={s.cardTitle} style={{ fontSize: 15 }}>
                      {name}
                    </p>
                    <p className={s.muted}>{when ? `Uploaded ${when}` : 'Uploaded'}</p>
                    {note && <p className={s.soft}>{note}</p>}
                    <div className={s.wrap} style={{ marginTop: 6 }}>
                      <SoftButton
                        leading="cloud_upload"
                        height={34}
                        disabled={busy}
                        onClick={() => {
                          setPending({ mode: 'replace', id: str(d.id), name });
                          setStep('file');
                        }}
                      >
                        Replace file
                      </SoftButton>
                      {url && (
                        <SoftButton href={url} external leading="open_in_new" height={34}>
                          View
                        </SoftButton>
                      )}
                    </div>
                  </div>
                  <StatusTag status={docStatus(str(d.status))} />
                </div>
              </Card>
            );
          })}
        </>
      )}

      <p className={s.note}>
        New and replaced files show Awaiting review until your counsellor checks them. Clear photographs of the whole page work best; your counsellor
        will ask again if anything is hard to read.
      </p>

      <div className={s.footer}>
        <PrimaryButton block leading="cloud_upload" disabled={busy} onClick={() => setStep('kind')}>
          {busy ? 'Uploading…' : 'Upload a document'}
        </PrimaryButton>
      </div>

      {/* The real pickers: a file, or the phone's camera. */}
      <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" hidden onChange={(e) => void send(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void send(e.target.files?.[0]).finally(() => (e.target.value = ''))} />

      {step === 'kind' && (
        <Dialog title="What are you uploading?" onClose={close}>
          <div className={s.options}>
            {DOC_KINDS.map(([k, label, icon]) => (
              <button
                key={k}
                type="button"
                className={s.option}
                onClick={() => {
                  setKind(k);
                  if (k === 'transcript' || k === 'certificate') setStep('level');
                  else {
                    setPending({ mode: 'new', kind: k, level: '', label });
                    setStep('file');
                  }
                }}
              >
                <IconCircle icon={icon} size={38} />
                <span className={s.grow}>{label}</span>
                <Icon name="chevron_right" size={20} />
              </button>
            ))}
          </div>
        </Dialog>
      )}

      {step === 'level' && (
        <Dialog title={kind === 'transcript' ? 'Which transcript?' : 'Which certificate?'} onClose={close}>
          <div className={s.options}>
            {DOC_LEVELS.map(([l, , sub]) => (
              <button
                key={l}
                type="button"
                className={s.option}
                onClick={() => {
                  setPending({ mode: 'new', kind, level: l, label: levelName(l, kind) });
                  setStep('file');
                }}
              >
                <IconCircle icon={docIcon(kind)} size={38} />
                <span className={s.grow} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{levelName(l, kind)}</span>
                  <span className={s.muted}>{sub}</span>
                </span>
                <Icon name="chevron_right" size={20} />
              </button>
            ))}
          </div>
        </Dialog>
      )}

      {step === 'file' && pending && (
        <Dialog title={pending.mode === 'new' ? `Add the file · ${pending.label || docLabel(kind)}` : `Replace ${pending.name}`} onClose={close}>
          <div className={s.options}>
            <button type="button" className={s.option} onClick={() => cameraInput.current?.click()}>
              <IconCircle icon="photo_camera" size={38} />
              <span className={s.grow} style={{ display: 'flex', flexDirection: 'column' }}>
                <span>Take a photo</span>
                <span className={s.muted}>Photograph the document (on a phone)</span>
              </span>
            </button>
            <button type="button" className={s.option} onClick={() => fileInput.current?.click()}>
              <IconCircle icon="attach_file" size={38} />
              <span className={s.grow} style={{ display: 'flex', flexDirection: 'column' }}>
                <span>Choose a file</span>
                <span className={s.muted}>PDF, JPG or PNG - up to 10 MB</span>
              </span>
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
