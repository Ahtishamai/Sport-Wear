import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma, plain } from '@/lib/db';
import { AdminPage, Card } from '@/components/admin/ui';
import { QuoteStatusForm } from '@/components/admin/QuoteStatusForm';
import { formatDateTime, money } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await prisma.quoteRequest.findUnique({
    where: { id },
    include: { product: { select: { title: true, handle: true } } },
  });
  if (!quote) notFound();

  const q = plain(quote);
  const sizeRun = (q.sizeRun ?? {}) as Record<string, number>;
  const attachments = (q.attachments ?? []) as { url: string; filename: string; size: number }[];

  return (
    <AdminPage
      title={q.reference}
      back={{ href: '/admin/quotes', label: 'All quote requests' }}
      description={`Received ${formatDateTime(q.createdAt)}`}
    >
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card title="Request">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Row label="Subject" value={q.subject} />
              <Row label="Team / organization" value={q.team} />
              <Row label="Contact" value={q.name} />
              <Row
                label="Email"
                value={
                  <a href={`mailto:${q.email}`} className="underline decoration-brand decoration-2">
                    {q.email}
                  </a>
                }
              />
              <Row
                label="Phone"
                value={
                  <a href={`tel:${q.phone}`} className="underline decoration-brand decoration-2">
                    {q.phone}
                  </a>
                }
              />
              <Row label="Sport" value={q.sport || '—'} />
              <Row label="Roster size" value={q.rosterSize ?? '—'} />
              <Row label="Timing" value={q.deadline || '—'} />
            </dl>

            {q.message && (
              <div className="mt-6 border-t border-[#EFEFEC] pt-5">
                <span className="field-label">Notes from the customer</span>
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{q.message}</p>
              </div>
            )}
          </Card>

          {(q.productTitle || Object.keys(sizeRun).length > 0) && (
            <Card title="Product configuration">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Row
                  label="Product"
                  value={
                    q.product ? (
                      <Link
                        href={`/admin/products/${q.product.handle}`}
                        className="underline decoration-brand decoration-2"
                      >
                        {q.product.title}
                      </Link>
                    ) : (
                      q.productTitle || '—'
                    )
                  }
                />
                <Row label="Colorway" value={q.colorway || '—'} />
                <Row label="Total units" value={q.totalUnits ?? '—'} />
                <Row
                  label="Unit price"
                  value={q.unitPrice ? money(Number(q.unitPrice)) : '—'}
                />
                <Row
                  label="Estimated total"
                  value={q.estTotal ? money(Number(q.estTotal)) : '—'}
                />
              </dl>

              {Object.keys(sizeRun).length > 0 && (
                <div className="mt-6 border-t border-[#EFEFEC] pt-5">
                  <span className="field-label">Size run</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(sizeRun)
                      .filter(([, v]) => Number(v) > 0)
                      .map(([size, v]) => (
                        <span
                          key={size}
                          className="border border-[#E3E3DF] bg-brand-tint px-3 py-2 text-center"
                        >
                          <span className="block text-[10px] font-bold uppercase text-[#8A7300]">
                            {size}
                          </span>
                          <span className="block font-display text-[16px] font-black">{v}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {attachments.length > 0 && (
            <Card title="Artwork & attachments">
              <ul className="space-y-2">
                {attachments.map((a, i) => (
                  <li key={i}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 border border-[#E3E3DF] px-3 py-2.5 text-[13px] hover:border-ink"
                    >
                      <span className="truncate font-medium">{a.filename}</span>
                      <span className="shrink-0 text-[12px] text-[#8A8C93]">
                        {(a.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <QuoteStatusForm
            id={q.id}
            status={q.status}
            adminNotes={q.adminNotes ?? ''}
            email={q.email}
            reference={q.reference}
            team={q.team}
          />

          <Card title="Source">
            <dl className="grid gap-3 text-[13px]">
              <Row label="Landed on" value={q.pageUrl || '—'} small />
              <Row label="Referrer" value={q.referrer || 'Direct'} small />
              <Row label="Channel" value={q.source} small />
            </dl>
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}

function Row({
  label,
  value,
  small,
}: {
  label: string;
  value: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div>
      <dt className="field-label">{label}</dt>
      <dd className={small ? 'break-all text-[12px] text-[#6B6D74]' : 'text-[15px] font-medium'}>
        {value}
      </dd>
    </div>
  );
}
