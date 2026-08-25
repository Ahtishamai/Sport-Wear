/**
 * Line icons — 24×24 viewBox, stroke=currentColor, 1.7 weight, round caps,
 * matching the stroke system specified in the design handoff.
 */

const PATHS: Record<string, string[]> = {
  chat: ['M4 4h16v12H5.17L4 17.17V4z', 'M8 8h8', 'M8 12h5'],
  clock: ['M12 3a9 9 0 1 1-9 9', 'M3 3v6h6', 'M12 8v4l3 2'],
  check: ['M20 6L9 17l-5-5'],
  truck: [
    'M3 7h11v10H3z',
    'M14 10h4l3 3v4h-7',
    'M6.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    'M17.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  ],
  art: ['M12 19l7-7 3 3-7 7-3-3z', 'M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z', 'M2 2l7.586 7.586'],
  rush: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  factory: ['M2 20h20', 'M4 20V9l5 3V9l5 3V7l6 4v9'],
  reorder: ['M21 2v6h-6', 'M3 12a9 9 0 0 1 15-6.7L21 8', 'M3 22v-6h6', 'M21 12a9 9 0 0 1-15 6.7L3 16'],
  star: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  phone: [
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
  ],
  mail: ['M4 4h16v16H4z', 'M4 6l8 6 8-6'],
  pin: ['M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  ruler: ['M3 15l6-12 12 6-6 12-12-6z', 'M8 6l2 1', 'M11 9l2 1', 'M14 12l2 1'],
  palette: [
    'M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H13a2 2 0 0 1 0-4h4a4 4 0 0 0 4-4 6 6 0 0 0-9-6z',
    'M7.5 11.5h.01',
    'M10.5 8h.01',
    'M15 8h.01',
  ],
  tag: ['M20.59 13.41L12 22l-9-9V3h10l7.59 7.59a2 2 0 0 1 0 2.82z', 'M7 7h.01'],
  arrowRight: ['M5 12h14', 'M13 6l6 6-6 6'],
  close: ['M18 6L6 18', 'M6 6l12 12'],
  menu: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2'],
  lightbulb: [
    'M9 18h6',
    'M10 22h4',
    'M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z',
  ],
  heart: [
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  ],
  users: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M22 21v-2a4 4 0 0 0-3-3.9',
    'M16 3.1a4 4 0 0 1 0 7.8',
  ],
  handshake: [
    'M11 17l2 2a1.4 1.4 0 0 0 2-2',
    'M13 15l2.5 2.5a1.4 1.4 0 0 0 2-2L13 11',
    'M2 12l3-3 4 4-3 3z',
    'M22 12l-3-3-4 4 3 3z',
    'M9 9l2-2h4l2 2',
  ],
  award: [
    'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z',
    'M8.2 13.9L7 22l5-3 5 3-1.2-8.1',
  ],
  sparkle: [
    'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z',
    'M19 17l.7 1.8L21.5 19.5l-1.8.7L19 22l-.7-1.8L16.5 19.5l1.8-.7L19 17z',
  ],
  target: [
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  ],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  compass: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M15.5 8.5l-2 5.5-5.5 2 2-5.5 5.5-2z'],
  shirt: [
    'M9 3l3 2 3-2 5 3-2 3-1.5-.9V21h-9V8.1L6 9 4 6l5-3z',
  ],
  gem: ['M6 3h12l3 6-9 12L3 9l3-6z', 'M3 9h18', 'M9 3l3 6 3-6', 'M12 9v12'],
  layers: ['M12 3l9 5-9 5-9-5 9-5z', 'M3 13l9 5 9-5', 'M3 17l9 5 9-5'],
  chart: ['M3 21h18', 'M7 21V11', 'M12 21V4', 'M17 21v-7'],
  globe: [
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'M3 12h18',
    'M12 3a14 14 0 0 1 0 18',
    'M12 3a14 14 0 0 0 0 18',
  ],
  leaf: ['M4 20s0-9 8-13c5-2.5 8-4 8-4s1 8-3 13-13 4-13 4z', 'M4 20L11 13'],
  pencil: ['M17 3l4 4L8 20H4v-4L17 3z', 'M14.5 5.5l4 4'],
};

export type IconName = keyof typeof PATHS | string;

export function Icon({
  name,
  size = 24,
  className,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const paths = PATHS[name] ?? PATHS.star;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function Stars({
  count = 5,
  size = 14,
  color = '#FFD100',
  className,
}: {
  count?: number;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{ color, fontSize: size, letterSpacing: '1px', lineHeight: 1 }}
      aria-label={`${count} out of 5 stars`}
    >
      {'★'.repeat(count)}
    </span>
  );
}
