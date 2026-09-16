export const socials = [
  { name: 'Facebook', url: 'https://www.facebook.com/modernmustardseed' },
  { name: 'Instagram', url: 'https://instagram.com/modernmustardseed' },
  { name: 'X', url: 'https://x.com/modmustardseed' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/sarahmscarano/' },
  { name: 'GitHub', url: 'https://github.com/ModernMustardSeed' },
];

/** The company Facebook page. Pinned as its own nav button (Sarah, 2026-07-13). */
export const facebookUrl = 'https://www.facebook.com/modernmustardseed';

// The inline nav row. Sarah 2026-09-11: Free Demos, the Store, and Free
// Playbooks came out of it. The studio's front row is the work and the
// disciplines now; the self-serve catalog still answers at its own URLs, it is
// simply not advertised from the top of every page.
export const navLinks = [
  { label: 'The Work', href: '/work' },
  { label: 'Services', href: '/services' },
  { label: 'The Studio', href: '/about' },
  { label: 'Journal', href: '/blog' },
];

export const bookingUrl = '/?book=1';

// Google Business Profile review link. Shareable cleanly via /review.
export const googleReviewUrl = 'https://g.page/r/CQPWYcgFAJByEAI/review';

/**
 * The public Google Business Profile (CID 8255098141806810627).
 *
 * SINGLE SOURCE. This URL is the only thing that ties the website entity to the
 * Google Business Profile entity in structured data, so it is imported, never
 * retyped. Used by `lib/jsonld.tsx` (sameAs + hasMap) and `data/google-reviews.ts`.
 */
export const googleProfileUrl = 'https://www.google.com/maps?cid=8255098141806810627';
