'use client';

/** One stroke weight, one grid, no icon font. Each is 20x20 on a 1.6 stroke. */
const P = ({ d }: { d: string }) => <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden focusable="false">
      {PATHS[name]}
    </svg>
  );
}

export type IconName = keyof typeof PATHS;

const PATHS = {
  overview: (
    <>
      <P d="M3 10.5 10 4l7 6.5" />
      <P d="M5 9.5V16h10V9.5" />
      <P d="M8.5 16v-3.5h3V16" />
    </>
  ),
  leads: (
    <>
      <P d="M3 16v-1a3.5 3.5 0 0 1 3.5-3.5h2A3.5 3.5 0 0 1 12 15v1" />
      <P d="M7.5 8.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
      <P d="M14 8h4M16 6v4" />
    </>
  ),
  contacts: (
    <>
      <P d="M5 3.5h10a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5z" />
      <P d="M3 6.5h2M3 10h2M3 13.5h2" />
      <P d="M10.5 9.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" />
      <P d="M8 13.6c.3-1.2 1.3-2 2.5-2s2.2.8 2.5 2" />
    </>
  ),
  chat: (
    <>
      <P d="M4 4.5h12v8H8l-4 3.5z" />
      <P d="M7 8h6M7 10.5h4" />
    </>
  ),
  inbox: (
    <>
      <P d="M3 10.5 5 4h10l2 6.5V16H3z" />
      <P d="M3 10.5h4l1 2h4l1-2h4" />
    </>
  ),
  reviews: (
    <>
      <P d="m10 3.5 2 4.2 4.5.6-3.3 3.2.8 4.5L10 13.9 6 16l.8-4.5L3.5 8.3 8 7.7z" />
    </>
  ),
  marketing: (
    <>
      <P d="M4 8.5v3a1 1 0 0 0 1 1h2l5 3.5v-12L7 7.5H5a1 1 0 0 0-1 1Z" />
      <P d="M14.5 7.5a3.5 3.5 0 0 1 0 5" />
    </>
  ),
  website: (
    <>
      <P d="M3.5 4.5h13v11h-13z" />
      <P d="M3.5 7.5h13" />
      <P d="M5.5 6h.01M7.5 6h.01" />
    </>
  ),
  accounts: (
    <>
      <P d="M8.5 11.5 5 15a2.1 2.1 0 0 1-3-3l3.5-3.5" />
      <P d="M11.5 8.5 15 5a2.1 2.1 0 0 1 3 3l-3.5 3.5" />
      <P d="M7.5 12.5l5-5" />
    </>
  ),
  operator: (
    <>
      <P d="M10 3.5 11.6 7l3.9.5-2.8 2.7.7 3.8L10 12.2 6.6 14l.7-3.8L4.5 7.5 8.4 7z" />
    </>
  ),
  search: (
    <>
      <P d="M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
      <P d="m13.5 13.5 3 3" />
    </>
  ),
  out: (
    <>
      <P d="M12 6V4.5h-8v11h8V14" />
      <P d="M9 10h8M14.5 7.5 17 10l-2.5 2.5" />
    </>
  ),
  check: <P d="m4.5 10.5 3.5 3.5 7.5-8" />,
  clock: (
    <>
      <P d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
      <P d="M10 6.5V10l2.5 1.5" />
    </>
  ),
  phone: <P d="M6.5 3.5 8 7 6.5 8.5a8 8 0 0 0 5 5L13 12l3.5 1.5V16c0 .6-.5 1-1.1 1C9 16.5 3.5 11 3.2 4.6c0-.6.4-1.1 1-1.1z" />,
  mail: (
    <>
      <P d="M3.5 5h13v10h-13z" />
      <P d="m3.5 6 6.5 5 6.5-5" />
    </>
  ),
  plus: <P d="M10 4.5v11M4.5 10h11" />,
  spark: (
    <>
      <P d="M4 13.5 7.5 9l3 2.5L16 5" />
      <P d="M12.5 5H16v3.5" />
    </>
  ),
} as const;
