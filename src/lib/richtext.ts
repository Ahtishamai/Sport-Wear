/**
 * The small amount of structure a shop owner can type into a plain textarea.
 *
 * The collection body field renders as paragraphs and nothing else, which is
 * fine for three sentences about a shelf and useless for the kind of page
 * that is meant to rank: that needs headings a search engine can read, lists
 * it can lift, and a table it can quote.
 *
 * So the field understands a handful of marks, chosen because somebody can
 * use them without being taught and because each one maps to an element that
 * does real work:
 *
 *   ## Heading           a section heading
 *   ### Question         a sub heading, and the question half of an FAQ
 *   - item               a list
 *   1. item              a numbered list
 *   | a | b |            a table, with |---| under the first row
 *   **bold**             emphasis
 *   [text](/path)        a link
 *
 * No raw HTML is accepted and none is produced. The parser returns plain
 * objects and the page renders them as React elements, so nothing typed in
 * the admin can inject markup into a shopper's page.
 */

export type Span = { text: string; bold?: boolean; href?: string };

export type Node =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; spans: Span[] }
  | { kind: 'list'; ordered: boolean; items: Span[][] }
  | { kind: 'table'; head: string[]; rows: string[][] };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/;
const BOLD = /\*\*([^*]+)\*\*/;

/** One line of text, split into plain, bold and linked pieces. */
export function spansOf(line: string): Span[] {
  const out: Span[] = [];
  let rest = line;

  while (rest) {
    const link = rest.match(LINK);
    const bold = rest.match(BOLD);
    // Whichever mark comes first in what is left.
    const next =
      link && bold ? (link.index! <= bold.index! ? 'link' : 'bold') : link ? 'link' : bold ? 'bold' : null;

    if (!next) {
      out.push({ text: rest });
      break;
    }
    const m = next === 'link' ? link! : bold!;
    if (m.index! > 0) out.push({ text: rest.slice(0, m.index) });
    if (next === 'link') out.push({ text: m[1], href: m[2] });
    else out.push({ text: m[1], bold: true });
    rest = rest.slice(m.index! + m[0].length);
  }

  return out.filter((s) => s.text !== '');
}

const cells = (row: string) =>
  row
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());

const isDivider = (row: string) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(row) && row.includes('-');

/** The typed text, as blocks a page can render. */
export function parseRichText(src: string): Node[] {
  const lines = String(src ?? '').replace(/\r\n?/g, '\n').split('\n');
  const nodes: Node[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(' ').trim();
    if (text) nodes.push({ kind: 'p', spans: spansOf(text) });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      continue;
    }

    const heading = trimmed.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      flush();
      nodes.push({ kind: heading[1].length === 2 ? 'h2' : 'h3', text: heading[2].trim() });
      continue;
    }

    // A table: a row of cells with a divider under it.
    if (trimmed.startsWith('|') && isDivider(lines[i + 1] ?? '')) {
      flush();
      const head = cells(trimmed);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(cells(lines[i].trim()));
        i++;
      }
      i--;
      nodes.push({ kind: 'table', head, rows });
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const items: Span[][] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const b = t.match(ordered ? /^\d+[.)]\s+(.*)$/ : /^[-*]\s+(.*)$/);
        if (!b) break;
        items.push(spansOf(b[1].trim()));
        i++;
      }
      i--;
      nodes.push({ kind: 'list', ordered, items });
      continue;
    }

    paragraph.push(trimmed);
  }
  flush();

  return nodes;
}

/** The plain words of a span run, for markup that cannot hold elements. */
export function plainOf(spans: Span[]): string {
  return spans.map((s) => s.text).join('').replace(/\s+/g, ' ').trim();
}

/**
 * The questions and answers in the text, for the page's FAQ markup.
 *
 * A question is an h3 whose text ends in a question mark; its answer is
 * everything up to the next heading. Only pairs that have both are returned,
 * because a question marked up without an answer is worse than no markup.
 */
export function faqPairs(nodes: Node[]): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.kind !== 'h3' || !node.text.trim().endsWith('?')) continue;

    const answer: string[] = [];
    for (let j = i + 1; j < nodes.length; j++) {
      const next = nodes[j];
      if (next.kind === 'h2' || next.kind === 'h3') break;
      if (next.kind === 'p') answer.push(plainOf(next.spans));
      else if (next.kind === 'list') answer.push(next.items.map(plainOf).join('. '));
    }
    const a = answer.join(' ').trim();
    if (a) out.push({ q: node.text.trim(), a });
  }
  return out;
}

/** The first heading in the text, which titles the section on the page. */
export function leadHeading(nodes: Node[]): string | null {
  const first = nodes.find((n) => n.kind === 'h2');
  return first && first.kind === 'h2' ? first.text : null;
}
