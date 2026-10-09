'use client';

import { useState } from 'react';
import { SITE_LINK_GROUPS, type SiteLinkGroup } from '@/data/site-links';

/**
 * Every link from the studio edition in one place (data/site-links.ts). Used
 * whole on /admin/website and filtered to the bootcamp groups on the Bootcamp
 * desk's Links tab.
 */
function Copy({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(url).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}
      className="shrink-0 text-[11px] uppercase tracking-[0.14em] font-mono font-bold text-[#141210] px-3 py-1.5 rounded-[3px] border border-[#141210] bg-white hover:bg-[#f5b700] transition-colors"
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function WebsiteLinks({ bootcampOnly = false }: { bootcampOnly?: boolean }) {
  const groups: SiteLinkGroup[] = bootcampOnly ? SITE_LINK_GROUPS.filter((g) => g.bootcamp) : SITE_LINK_GROUPS;
  return (
    <div className="grid gap-6">
      {groups.map((g) => (
        <section key={g.title} className="bg-white border border-[#141210] rounded-[4px]">
          <header className="px-5 py-4 border-b border-[#141210] bg-[#fcfaf3]">
            <h2 className="font-sans font-bold text-[20px] tracking-[-0.02em] text-[#141210]">{g.title}</h2>
            <p className="font-sans text-[14px] text-[#4a4339] mt-1">{g.blurb}</p>
          </header>
          <ul className="divide-y divide-[#141210]/15">
            {g.links.map((l) => (
              <li key={l.url + l.label} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-sans font-bold text-[15px] text-[#141210] border-b-2 border-[#f5b700] hover:border-[#141210]">
                    {l.label} ↗
                  </a>
                  <p className="font-mono text-[11.5px] text-[#4a4339] truncate mt-1">{l.url.replace(/^https:\/\//, '')}</p>
                  {l.note && <p className="font-sans text-[13px] text-[#4a4339] mt-0.5">{l.note}</p>}
                </div>
                <Copy url={l.url} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
