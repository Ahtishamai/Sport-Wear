import { describe, expect, it } from 'vitest';
import { faqPairs, leadHeading, parseRichText, plainOf, spansOf, type Node } from '@/lib/richtext';

/** Narrow a parsed node in a test, failing loudly if it is the wrong kind. */
const as = <K extends Node['kind']>(node: Node, kind: K) => {
  expect(node.kind).toBe(kind);
  return node as Extract<Node, { kind: K }>;
};

describe('a line of text', () => {
  it('is left alone when it is just words', () => {
    expect(spansOf('Sublimated in our own shop.')).toEqual([{ text: 'Sublimated in our own shop.' }]);
  });

  it('picks out bold', () => {
    expect(spansOf('From **$20 each** on a full team order.')).toEqual([
      { text: 'From ' },
      { text: '$20 each', bold: true },
      { text: ' on a full team order.' },
    ]);
  });

  it('picks out a link', () => {
    expect(spansOf('See the [size chart](/size-chart) first.')).toEqual([
      { text: 'See the ' },
      { text: 'size chart', href: '/size-chart' },
      { text: ' first.' },
    ]);
  });

  it('handles both in one line, in the order they appear', () => {
    const spans = spansOf('[Jerseys](/collections/shirts) start at **$20**.');
    expect(spans).toEqual([
      { text: 'Jerseys', href: '/collections/shirts' },
      { text: ' start at ' },
      { text: '$20', bold: true },
      { text: '.' },
    ]);
  });

  it('leaves a stray asterisk as a character, not a mark', () => {
    expect(spansOf('Sizes YS* to 3XL')).toEqual([{ text: 'Sizes YS* to 3XL' }]);
  });
});

describe('blocks of typed text', () => {
  it('splits paragraphs on blank lines, the way the field always did', () => {
    const nodes = parseRichText('One sentence.\n\nAnother one.');
    expect(nodes.map((n) => n.kind)).toEqual(['p', 'p']);
  });

  it('joins wrapped lines into one paragraph', () => {
    const nodes = parseRichText('A sentence that was\nwrapped in the box.');
    expect(nodes).toHaveLength(1);
    expect(plainOf(as(nodes[0], 'p').spans)).toBe('A sentence that was wrapped in the box.');
  });

  it('reads headings at two levels', () => {
    const nodes = parseRichText('## What you get\n\nText.\n\n### How long does it take?');
    expect(nodes[0]).toEqual({ kind: 'h2', text: 'What you get' });
    expect(nodes[2]).toEqual({ kind: 'h3', text: 'How long does it take?' });
  });

  it('reads a bulleted list as one block', () => {
    const nodes = parseRichText('- Names included\n- Numbers included\n- No setup fee');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ kind: 'list', ordered: false });
    expect(as(nodes[0], 'list').items).toHaveLength(3);
  });

  it('reads a numbered list and knows it is ordered', () => {
    const nodes = parseRichText('1. Send your logo\n2. Approve the mockup\n3. We print');
    expect(nodes[0]).toMatchObject({ kind: 'list', ordered: true });
  });

  it('does not run a bulleted list into a numbered one', () => {
    const nodes = parseRichText('- One\n- Two\n\n1. First\n2. Second');
    expect(nodes.map((n) => n.kind)).toEqual(['list', 'list']);
    expect(nodes.map((n) => as(n, 'list').ordered)).toEqual([false, true]);
  });

  it('reads a table with its header row', () => {
    const nodes = parseRichText(
      ['| Size | Chest | Length |', '|---|---|---|', '| YS | 30 in | 24 in |', '| M | 40 in | 29 in |'].join('\n')
    );
    expect(nodes[0]).toEqual({
      kind: 'table',
      head: ['Size', 'Chest', 'Length'],
      rows: [
        ['YS', '30 in', '24 in'],
        ['M', '40 in', '29 in'],
      ],
    });
  });

  it('treats a pipe line with no divider under it as ordinary text', () => {
    // Otherwise a sentence that happens to contain a pipe becomes a table.
    const nodes = parseRichText('| this is not a table');
    expect(nodes[0].kind).toBe('p');
  });

  it('carries on after a table', () => {
    const nodes = parseRichText('| A | B |\n|---|---|\n| 1 | 2 |\n\nAfter the table.');
    expect(nodes.map((n) => n.kind)).toEqual(['table', 'p']);
  });

  it('gives nothing for an empty field', () => {
    expect(parseRichText('')).toEqual([]);
    expect(parseRichText('   \n\n  ')).toEqual([]);
  });

  it('accepts text typed on Windows', () => {
    expect(parseRichText('## Heading\r\n\r\nA line.\r\n').map((n) => n.kind)).toEqual(['h2', 'p']);
  });
});

describe('the questions in the text', () => {
  const copy = [
    '## Frequently asked questions',
    '',
    '### How long does an order take?',
    '',
    'Three to four weeks from approval. A two week rush is available.',
    '',
    '### Which sizes do you make?',
    '',
    '- Youth small to youth large',
    '- Adult small to 3XL',
    '',
    '## Something else',
    '',
    'Not an answer.',
  ].join('\n');

  it('pairs each question with the text under it', () => {
    const pairs = faqPairs(parseRichText(copy));
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toEqual({
      q: 'How long does an order take?',
      a: 'Three to four weeks from approval. A two week rush is available.',
    });
  });

  it('takes a list as an answer too', () => {
    const pairs = faqPairs(parseRichText(copy));
    expect(pairs[1].a).toBe('Youth small to youth large. Adult small to 3XL');
  });

  it('stops at the next heading rather than swallowing the page', () => {
    const pairs = faqPairs(parseRichText(copy));
    expect(pairs[1].a).not.toContain('Not an answer');
  });

  it('ignores a sub heading that is not a question', () => {
    expect(faqPairs(parseRichText('### Fabric\n\nPolyester.'))).toEqual([]);
  });

  it('never marks up a question with no answer under it', () => {
    // A question in the markup that the page does not answer is worse than
    // no markup at all.
    expect(faqPairs(parseRichText('### Do you ship to Canada?\n\n### And Mexico?'))).toEqual([]);
  });
});

describe('the heading that titles the section', () => {
  it('is the first one in the text', () => {
    expect(leadHeading(parseRichText('## Custom baseball uniforms\n\nText.'))).toBe(
      'Custom baseball uniforms'
    );
  });

  it('is nothing when the shop typed plain paragraphs', () => {
    expect(leadHeading(parseRichText('Just a sentence about the shelf.'))).toBeNull();
  });
});
