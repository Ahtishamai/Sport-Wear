import Image from 'next/image';
import { SIZE_CHART, type SizeTable } from '@/lib/size-chart';

/**
 * The size chart: the adult and youth measurements as real tables, and the
 * client's chart picture beneath them for how each one is measured.
 *
 * Plain markup and no state, so the same component serves the size chart
 * page, the end of every product page that is sized like a shirt, and the
 * landing page. On a phone each table scrolls sideways inside itself with the
 * measurement names held in place, so the page never does.
 */
export function SizeChart({
  heading = 'Size chart',
  intro,
  showImage = true,
  id = 'size-chart',
  headingLevel = 2,
}: {
  heading?: string;
  intro?: string;
  showImage?: boolean;
  id?: string;
  headingLevel?: 1 | 2;
}) {
  const H = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <H id={`${id}-title`} className="h-display text-[26px] md:text-[34px]">
        {heading}
      </H>
      {intro && <p className="mt-3 max-w-[720px] text-[15px] leading-relaxed text-body md:text-[16px]">{intro}</p>}
      <p className="mt-2 text-[13px] font-medium text-muted">
        All measurements in inches.
        <span className="sm:hidden"> Swipe a table to see every size →</span>
      </p>

      <div className="mt-6 space-y-7">
        <Table table={SIZE_CHART.adult} />
        <Table table={SIZE_CHART.youth} />
      </div>

      <p className="mt-5 border-l-4 border-brand bg-surface px-4 py-3 text-[13px] text-body md:text-[14px]">
        <strong className="font-semibold text-ink">Acceptable tolerance:</strong> {SIZE_CHART.tolerance}
      </p>

      {showImage && (
        <figure className="mt-8">
          <Image
            src={SIZE_CHART.image}
            alt="Design Sportswear T-shirt size chart: adult S to 5XL and youth YXS to YXL, with where length (A), chest (C) and sleeve (D) are measured"
            width={1536}
            height={1024}
            sizes="(min-width:1200px) 1100px, 100vw"
            className="h-auto w-full border border-hairline"
          />
          <figcaption className="mt-2 text-[13px] text-muted">
            A: length from the centre back, without the rib. C: chest, armpit to armpit. D: sleeve length.
          </figcaption>
        </figure>
      )}
    </section>
  );
}

function Table({ table }: { table: SizeTable }) {
  return (
    <div className="overflow-x-auto border border-hairline">
      <table className="w-full min-w-[520px] border-collapse text-center text-[14px]">
        <caption className="sr-only">{table.label} sizes</caption>
        <thead>
          <tr className="bg-ink text-white">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-brand px-3 py-2.5 text-left font-display text-[14px] font-extrabold uppercase tracking-[.06em] text-ink"
            >
              {table.label}
            </th>
            {table.sizes.map((s) => (
              <th key={s} scope="col" className="px-3 py-2.5 font-display text-[14px] font-extrabold">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={r.name} className={i % 2 ? 'bg-surface' : 'bg-white'}>
              <th
                scope="row"
                className={`sticky left-0 z-10 w-[120px] min-w-[120px] px-3 py-2.5 text-left text-[12.5px] font-semibold leading-snug text-ink sm:w-auto sm:whitespace-nowrap sm:text-[13px] ${
                  i % 2 ? 'bg-surface' : 'bg-white'
                }`}
              >
                {r.key && <span className="mr-1.5 font-extrabold">{r.key}</span>}
                {r.name}
              </th>
              {r.values.map((v, j) => (
                <td key={j} className="whitespace-nowrap border-l border-hairline px-3 py-2.5 text-body">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
