/**
 * Brand icons for the social links, in each network's own colours.
 *
 * The network is worked out from the link and the label rather than stored, so
 * pasting a Facebook address into the settings is all it takes to get the
 * Facebook icon. Anything unrecognised keeps the short text that was typed in,
 * so a new network is never a blank square.
 */

type Network = 'facebook' | 'instagram' | 'tiktok' | 'x' | 'youtube' | 'linkedin' | 'pinterest' | 'whatsapp';

const MATCH: [Network, RegExp][] = [
  ['facebook', /facebook|fb\.com|^f$/i],
  ['instagram', /instagram|insta|^ig$/i],
  ['tiktok', /tiktok|^tt$/i],
  ['x', /twitter|x\.com|^x$/i],
  ['youtube', /youtube|youtu\.be|^yt$/i],
  ['linkedin', /linkedin|^in$/i],
  ['pinterest', /pinterest|^p$/i],
  ['whatsapp', /whatsapp|wa\.me/i],
];

export function networkOf(link: { label?: string; short?: string; href?: string }): Network | null {
  for (const [name, re] of MATCH) {
    if (re.test(link.href ?? '') || re.test(link.label ?? '') || re.test(link.short ?? '')) return name;
  }
  return null;
}

/** Tile colour, and the colour the glyph is drawn in on top of it. */
const STYLE: Record<Network, { bg: string; fg: string; border?: string }> = {
  facebook: { bg: '#1877F2', fg: '#FFFFFF' },
  // Instagram's mark has no flat colour; this is its own gradient.
  instagram: {
    bg: 'linear-gradient(45deg,#FEDA75 0%,#FA7E1E 25%,#D62976 55%,#962FBF 80%,#4F5BD5 100%)',
    fg: '#FFFFFF',
  },
  // TikTok's own colour is black, which needs an edge to show on a dark footer.
  tiktok: { bg: '#010101', fg: '#FFFFFF', border: 'rgba(255,255,255,.35)' },
  x: { bg: '#000000', fg: '#FFFFFF', border: 'rgba(255,255,255,.35)' },
  youtube: { bg: '#FF0000', fg: '#FFFFFF' },
  linkedin: { bg: '#0A66C2', fg: '#FFFFFF' },
  pinterest: { bg: '#E60023', fg: '#FFFFFF' },
  whatsapp: { bg: '#25D366', fg: '#FFFFFF' },
};

const GLYPH: Record<Network, React.ReactNode> = {
  facebook: (
    <path d="M13.3 20.5v-7h2.3l.35-2.7h-2.65V9.07c0-.78.22-1.31 1.34-1.31h1.43V5.34a19.6 19.6 0 0 0-2.08-.11c-2.06 0-3.47 1.26-3.47 3.57V10.8H8.2v2.7h2.32v7h2.78z" />
  ),
  instagram: (
    <>
      <path d="M8.3 3.5h7.4a4.8 4.8 0 0 1 4.8 4.8v7.4a4.8 4.8 0 0 1-4.8 4.8H8.3a4.8 4.8 0 0 1-4.8-4.8V8.3a4.8 4.8 0 0 1 4.8-4.8zm0 1.9A2.9 2.9 0 0 0 5.4 8.3v7.4a2.9 2.9 0 0 0 2.9 2.9h7.4a2.9 2.9 0 0 0 2.9-2.9V8.3a2.9 2.9 0 0 0-2.9-2.9H8.3z" />
      <path d="M12 7.6a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8zm0 1.9a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
      <circle cx="16.7" cy="7.3" r="1.1" />
    </>
  ),
  tiktok: (
    <path d="M16.1 3h-2.6v11.1a2.2 2.2 0 1 1-1.9-2.2V9.2a4.9 4.9 0 1 0 4.5 4.9V9.3c.9.6 2 1 3.1 1V7.7c-1.8-.1-3.1-1.6-3.1-3.4V3z" />
  ),
  x: (
    <path d="M17.2 4h2.6l-5.7 6.5L21 20h-5.3l-3.6-4.8L7.9 20H5.3l6.1-7-5.6-9h5.4l3.3 4.4L17.2 4zm-.9 14.4h1.4L9.1 5.5H7.6l8.7 12.9z" />
  ),
  youtube: (
    <path d="M21.2 8.1a2.4 2.4 0 0 0-1.7-1.7C18 6 12 6 12 6s-6 0-7.5.4A2.4 2.4 0 0 0 2.8 8.1 25 25 0 0 0 2.4 12c0 1.3.1 2.6.4 3.9a2.4 2.4 0 0 0 1.7 1.7C6 18 12 18 12 18s6 0 7.5-.4a2.4 2.4 0 0 0 1.7-1.7c.3-1.3.4-2.6.4-3.9s-.1-2.6-.4-3.9zM10.1 14.6V9.4l5 2.6-5 2.6z" />
  ),
  linkedin: (
    <path d="M6.9 8.8v10.3H3.7V8.8h3.2zM5.3 3.9a1.9 1.9 0 1 1 0 3.7 1.9 1.9 0 0 1 0-3.7zm4.1 4.9h3.1v1.4h.05c.43-.8 1.5-1.65 3.1-1.65 3.3 0 3.9 2.1 3.9 4.9v5.65h-3.2v-5c0-1.2 0-2.75-1.7-2.75-1.7 0-1.95 1.3-1.95 2.65v5.1H9.4V8.8z" />
  ),
  pinterest: (
    <path d="M12 3a9 9 0 0 0-3.3 17.4c-.08-.7-.15-1.8.03-2.6l1.1-4.6s-.28-.56-.28-1.4c0-1.3.76-2.3 1.7-2.3.8 0 1.2.6 1.2 1.33 0 .8-.5 2-.78 3.14-.22.95.48 1.72 1.4 1.72 1.7 0 3-1.78 3-4.35 0-2.27-1.63-3.86-3.97-3.86-2.7 0-4.3 2-4.3 4.1 0 .8.3 1.68.7 2.16a.3.3 0 0 1 .06.27l-.26 1.05c-.04.17-.14.2-.32.12-1.2-.56-1.95-2.3-1.95-3.7 0-3 2.2-5.78 6.33-5.78 3.32 0 5.9 2.37 5.9 5.54 0 3.3-2.08 5.96-4.97 5.96-.97 0-1.88-.5-2.2-1.1l-.6 2.3c-.2.84-.78 1.9-1.18 2.54A9 9 0 1 0 12 3z" />
  ),
  whatsapp: (
    <path d="M12 3.5a8.4 8.4 0 0 0-7.2 12.7L3.5 20.5l4.4-1.2A8.4 8.4 0 1 0 12 3.5zm0 1.9a6.5 6.5 0 1 1-3.3 12.1l-.3-.2-2.6.7.7-2.5-.2-.3A6.5 6.5 0 0 1 12 5.4zm-3 3c-.15 0-.4.06-.6.3-.2.25-.78.77-.78 1.86s.8 2.15.9 2.3c.12.15 1.55 2.47 3.82 3.37 1.9.75 2.28.6 2.7.56.4-.04 1.3-.53 1.5-1.05.18-.52.18-.96.12-1.05-.06-.1-.22-.15-.46-.27-.24-.12-1.4-.7-1.62-.78-.22-.08-.38-.12-.54.12-.16.25-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.18-.7-.62-1.18-1.4-1.32-1.64-.14-.24 0-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.44z" />
  ),
};

export function SocialIcon({
  link,
  size = 38,
}: {
  link: { label?: string; short?: string; href?: string };
  size?: number;
}) {
  const network = networkOf(link);
  if (!network) {
    return (
      <span className="text-[13px] font-semibold text-ondark-3">{link.short || link.label?.[0]}</span>
    );
  }
  const { bg, fg, border } = STYLE[network];
  const glyph = size * 0.58;

  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: bg,
        boxShadow: border ? `inset 0 0 0 1px ${border}` : undefined,
      }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill={fg} focusable="false">
        {GLYPH[network]}
      </svg>
    </span>
  );
}
