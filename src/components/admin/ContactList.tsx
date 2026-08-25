'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/admin-client';
import { Badge, Button, EmptyState, Select, useToast } from './ui';
import { formatDateTime } from '@/lib/utils';
import { Icon } from '@/components/site/Icon';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  pageUrl: string | null;
  createdAt: string | Date;
};

const TONE = {
  NEW: 'yellow',
  IN_PROGRESS: 'blue',
  QUOTED: 'blue',
  WON: 'green',
  LOST: 'red',
} as const;

export function ContactList({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    try {
      await api.update('contacts', id, { status });
      toast('Status updated');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.remove('contacts', id);
      toast('Message deleted');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  }

  if (messages.length === 0) {
    return <EmptyState title="No messages yet" body="Contact form submissions will appear here." />;
  }

  return (
    <ol className="border border-[#E3E3DF] bg-white">
      {messages.map((m) => {
        const isOpen = open === m.id;
        return (
          <li key={m.id} className="border-b border-[#EFEFEC] last:border-0">
            <div className={cn('flex items-center gap-3 px-5 py-3.5', isOpen && 'bg-brand-tint')}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : m.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold">{m.name}</span>
                  <Badge tone={TONE[m.status as keyof typeof TONE] ?? 'neutral'}>
                    {m.status.replace('_', ' ')}
                  </Badge>
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] text-[#8A8C93]">
                  {m.subject ? `${m.subject} — ` : ''}
                  {m.message}
                </span>
              </button>
              <span className="hidden shrink-0 text-[12px] text-[#8A8C93] sm:block">
                {formatDateTime(m.createdAt)}
              </span>
              <button
                type="button"
                onClick={() => remove(m.id)}
                aria-label="Delete message"
                className="px-1.5 text-[#8A8C93] hover:text-[#C42027]"
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            {isOpen && (
              <div className="border-t border-[#EFEFEC] bg-[#FAFAF8] p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <span className="field-label">Email</span>
                    <a
                      href={`mailto:${m.email}`}
                      className="text-[14px] font-medium underline decoration-brand decoration-2"
                    >
                      {m.email}
                    </a>
                  </div>
                  <div>
                    <span className="field-label">Phone</span>
                    <span className="text-[14px]">{m.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="field-label">Status</span>
                    <Select
                      value={m.status}
                      onChange={(e) => setStatus(m.id, e.target.value)}
                      className="!py-2 text-[13px]"
                    >
                      <option value="NEW">New</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="WON">Resolved</option>
                      <option value="LOST">Closed</option>
                    </Select>
                  </div>
                </div>

                <div className="mt-5">
                  <span className="field-label">Message</span>
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.message}</p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent(
                      `Re: ${m.subject || 'Your message to Design Sportswear'}`
                    )}`}
                    className="inline-flex"
                  >
                    <Button variant="ink" size="sm">
                      Reply by email
                    </Button>
                  </a>
                  {m.pageUrl && (
                    <span className="text-[12px] text-[#8A8C93]">Sent from {m.pageUrl}</span>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
