/**
 * Which paths wear the Riviera type. Shared by components/pop/RivieraScope
 * (client navigations) and the inline head script in app/layout.tsx (first
 * paint), so the two can never disagree.
 */
export const RIVIERA_OFF_PREFIX = [
  '/admin',
  '/portal',
  '/cc',
  '/office',
  '/demo/',
  '/switchboard/live',
  '/sarah',
  '/hatchery/',
  '/voice-agents/build/demo/',
  '/white-label/demo',
  '/white-label/sheet',
  '/white-label/hq',
  // The same pages on an agency's own host (data/white-label-hosts.ts).
  '/desk/',
  '/proposal/',
  '/scaling-roadmap/r/',
  '/audit/',
];
export const RIVIERA_OFF_EXACT = ['/super-nomad', '/partners/playbook', '/agency', '/receptionist'];
// Exact paths an off prefix would catch that still wear the site's type:
// '/sarah' closes the CXC and Eternal Optimist booths, not the MMS portfolio.
export const RIVIERA_ON_EXACT = ['/sarahscarano'];

export function isRivieraPage(path: string): boolean {
  if (RIVIERA_ON_EXACT.includes(path)) return true;
  if (RIVIERA_OFF_EXACT.includes(path)) return false;
  if (path.endsWith('/hq')) return false;
  // Entries ending in a slash only close their sub-pages (/audit stays on the Riviera, /audit/[id] does not).
  return !RIVIERA_OFF_PREFIX.some((p) => path.startsWith(p));
}

/** The inline script for <head>: sets html.riv from the path before paint. */
export function rivieraHeadScript(): string {
  return `(function(){var p=location.pathname,x=${JSON.stringify(RIVIERA_OFF_EXACT)},f=${JSON.stringify(RIVIERA_OFF_PREFIX)},y=${JSON.stringify(RIVIERA_ON_EXACT)},on=x.indexOf(p)<0&&!/\\/hq$/.test(p);for(var i=0;on&&i<f.length;i++)if(p.indexOf(f[i])===0)on=false;if(y.indexOf(p)>=0)on=true;if(on)document.documentElement.classList.add('riv')})();`;
}
