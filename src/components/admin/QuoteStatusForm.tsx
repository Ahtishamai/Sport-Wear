'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import { Button, Card, Select, Textarea, useToast } from './ui';

const STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In progress — mockup being made' },
  { value: 'QUOTED', label: 'Quoted — price sent' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

export function QuoteStatusForm({
  id,
  status: initialStatus,
  adminNotes: initialNotes,
  email,
  reference,
  team,
}: {
  id: string;
  status: string;
  adminNotes: string;
  email: string;
  reference: string;
  team: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);

  const dirty = status !== initialStatus || notes !== initialNotes;

  async function save() {
    setBusy(true);
    try {
      await api.update('quotes', id, { status, adminNotes: notes });
      toast('Quote updated');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  const mailto = `mailto:${email}?subject=${encodeURIComponent(
    `Your quote from Design Sportswear (${reference})`
  )}&body=${encodeURIComponent(
    `Hi ${team},\n\nThanks for your request — here is your mockup and pricing.\n\n`
  )}`;

  return (
    <Card title="Status & follow-up">
      <div className="grid gap-4">
        <div>
          <span className="field-label">Status</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <span className="field-label">Internal notes</span>
          <Textarea
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mockup v2 sent, waiting on logo files…"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="yellow" onClick={save} disabled={busy || !dirty}>
            {busy ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </Button>
          <a
            href={mailto}
            className="inline-flex items-center rounded-[2px] border border-[#D6D6D1] px-4 py-2.5 text-[13px] font-semibold hover:border-ink"
          >
            Reply by email
          </a>
        </div>
      </div>
    </Card>
  );
}
