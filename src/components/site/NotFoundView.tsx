import Link from 'next/link';
import { getNavCollections } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { NotFoundBeacon } from './NotFoundBeacon';
import { QuoteButton } from './QuoteButton';

/**
 * The page a lost visitor lands on.
 *
 * A bare "not found" sends them back to Google, which is the one outcome
 * worth designing against: everything here is a way onward — the collections
 * they were most likely looking for, a quote, and a phone number for the
 * coach who has a deadline and no patience for a website.
 */
export async function NotFoundView() {
  const [settings, collections] = await Promise.all([getSettings(), getNavCollections()]);
  const top = collections.filter((c) => c.parentIds.length === 0).slice(0, 6);

  return (
    <section className="gutter py-16 md:py-24" data-reveal-root>
      <div className="max-w-[760px]">
        <p className="eyebrow text-brand-text">Error 404</p>
        <h1 className="h-display mt-3 text-[clamp(26px,3vw,40px)] leading-[1.05]">
          That page is not here any more
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-body">
          The address may have changed, or it may have been typed slightly wrong. Nothing is
          lost — everything we make is still below, and we can have a mockup of it in your
          hands within 24 hours.
        </p>
        <NotFoundBeacon />

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/collections" className="btn btn-yellow">
            Browse everything we make
          </Link>
          <QuoteButton className="btn btn-outline" subject="404">
            Request a quote
          </QuoteButton>
          {settings.phone ? (
            <a
              href={settings.phoneHref || `tel:${settings.phone}`}
              className="text-[14px] font-semibold text-body underline-offset-4 hover:text-ink hover:underline"
            >
              or call {settings.phone}
            </a>
          ) : null}
        </div>
      </div>

      {top.length > 0 ? (
        <div className="mt-14 border-t border-hairline pt-10">
          <h2 className="h-display text-[20px] md:text-[22px]">Where most people were heading</h2>
          <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/collections/${c.handle}`}
                  className="group flex items-baseline justify-between gap-4 border-b border-hairline-2 py-2 text-[15px] hover:text-brand-text"
                >
                  <span className="font-medium">{c.title}</span>
                  <span className="micro text-faint">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
