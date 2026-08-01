/**
 * The parable the studio is named for, single-sourced.
 *
 * The verse renders on the homepage twice (the 3D slab welded to the hero and
 * the footer card) and is emitted a third time as schema.org Quotation, so it
 * lives here once instead of drifting across three files.
 *
 * Segments carry their own emphasis flag: `stamp` marks the two words the brand
 * treats as objects ("mustard seed", "tree"). Each surface decides how a stamped
 * word looks. Nobody re-types the verse.
 */

export const PARABLE_REFERENCE = 'Matthew 13:31-32';

export const PARABLE_SEGMENTS: { t: string; stamp?: true }[] = [
  { t: 'The kingdom of heaven is like a ' },
  { t: 'mustard seed', stamp: true },
  {
    t: ', which a man took and planted in his field. Though it is the smallest of all seeds, yet when it grows, it is the largest of garden plants and becomes a ',
  },
  { t: 'tree', stamp: true },
  { t: ', so that the birds come and perch in its branches.' },
];

/** The verse as one clean string. Used for schema and anywhere plain text is needed. */
export const PARABLE_TEXT = PARABLE_SEGMENTS.map((s) => s.t).join('');
