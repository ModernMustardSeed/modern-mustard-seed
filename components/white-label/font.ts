import { Instrument_Serif, Inter_Tight } from 'next/font/google';

/**
 * The white label surfaces (demo, portal, desk) wear neutral faces, never the
 * MMS display faces: an agency's client should not recognise our type.
 * Inter Tight carries the interface; Instrument Serif carries headlines and
 * big numerals on the portal and desk, so they read as studio work rather
 * than a software template.
 */
export const wlSans = Inter_Tight({ subsets: ['latin'], display: 'swap', weight: ['400', '500', '600', '700', '800', '900'] });

export const wlSerif = Instrument_Serif({ subsets: ['latin'], display: 'swap', weight: '400', style: ['normal', 'italic'], variable: '--wl-serif' });
