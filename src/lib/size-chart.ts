/**
 * The shop's T-shirt / jersey size chart, as the client sent it
 * (public/size-chart/t-shirt-size-chart.png is the same chart as a picture).
 *
 * Kept as data as well as a picture so the chart can be printed as a real
 * table: readable on a phone, by a screen reader and by a search engine,
 * which none of them can do with lettering inside an image.
 *
 * Measurements are in inches. A: centre back length without the rib (C.B.L
 * W/O RIB); C: chest, measured armpit to armpit; D: sleeve length.
 */
export type SizeTable = {
  label: string;
  sizes: string[];
  rows: { key: string; name: string; values: string[] }[];
};

export const SIZE_CHART: { adult: SizeTable; youth: SizeTable; tolerance: string; image: string } = {
  adult: {
    label: 'Adult',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
    rows: [
      { key: 'A', name: 'Length (C.B.L w/o rib)', values: ['26 ½"', '27 ½"', '28 ½"', '29 ½"', '31 ½"', '32 ½"', '33 ½"', '34 ½"'] },
      { key: 'C', name: 'Chest (armpit)', values: ['19 ½"', '21"', '22 ½"', '24"', '27"', '28 ½"', '30"', '31 ½"'] },
      { key: 'D', name: 'Sleeve length (SS)', values: ['9"', '9 ½"', '10"', '10 ½"', '11 ¼"', '11 ½"', '11 ¾"', '12 ¼"'] },
      { key: '', name: 'Sleeve length (LS)', values: ['23"', '24"', '25"', '25 ½"', '26 ½"', '27"', '27"', '27"'] },
    ],
  },
  youth: {
    label: 'Youth',
    sizes: ['YXS', 'YS', 'YM', 'YL', 'YXL'],
    rows: [
      { key: 'A', name: 'Length (C.B.L w/o rib)', values: ['20 ¼"', '21 ½"', '22 ¾"', '24"', '25 ½"'] },
      { key: 'C', name: 'Chest (armpit)', values: ['13"', '15"', '17"', '18 ½"', '20"'] },
      { key: 'D', name: 'Sleeve length (SS)', values: ['7"', '7 ½"', '8"', '8 ½"', '9"'] },
      { key: '', name: 'Sleeve length (LS)', values: ['18 ½"', '19 ½"', '20 ½"', '21 ¾"', '23"'] },
    ],
  },
  // The client's own wording, kept as sent.
  tolerance: 'If measurement is >½", then +1", +1" and +½"; then +½", +1" then ¼".',
  image: '/size-chart/t-shirt-size-chart.png',
};

/** Whether a product is sized like a shirt, so the chart applies to it. */
export function usesShirtSizes(sizes: string[]): boolean {
  const known = new Set([...SIZE_CHART.adult.sizes, ...SIZE_CHART.youth.sizes]);
  return sizes.some((s) => known.has(String(s).trim().toUpperCase()));
}
