import { Inter_Tight } from 'next/font/google';

/**
 * The white label surfaces (demo, portal) wear a neutral sans, never the
 * MMS display faces: an agency's client should not recognise our type.
 */
export const wlSans = Inter_Tight({ subsets: ['latin'], display: 'swap', weight: ['400', '500', '600', '700', '800', '900'] });
