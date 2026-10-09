import type { Metadata } from 'next';
import { deskCalls, deskFromKey } from '@/lib/white-label/desk';
import { wlSans } from '@/components/white-label/font';
import ClientDesk from '@/components/white-label/ClientDesk';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string; id: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { slug, id } = await params;
  const desk = await deskFromKey(slug, id, one((await searchParams).k));
  return {
    title: { absolute: desk ? `${desk.client.business} · Front Desk` : 'Front Desk' },
    robots: { index: false, follow: false },
    // The signed key rides in this page's URL. No referrer, so the agency's
    // logo host and any link out never receive it.
    referrer: 'no-referrer',
    icons: desk?.agency.logo_url ? { icon: desk.agency.logo_url } : undefined,
  };
}

/**
 * A white label client's front desk: every call its receptionist took, what
 * the caller needs, and the recording, in the agency's brand. Opened by a
 * signed link (lib/white-label/desk.ts), no account to forget.
 */
export default async function ClientDeskPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug, id } = await params;
  const q = await searchParams;
  const key = one(q.k);
  const desk = await deskFromKey(slug, id, key);

  if (!desk) {
    return (
      <div className={`${wlSans.className} grid min-h-screen place-items-center bg-[#f5f6f8] px-5 text-neutral-900`}>
        <div className="max-w-md text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">Front desk</p>
          <h1 className="mt-3 text-3xl font-black">This link is not active.</h1>
          <p className="mt-4 text-neutral-600">Open your front desk from the link your web team sent you. If it still does not open, ask them for a fresh one.</p>
        </div>
      </div>
    );
  }

  const { agency, client } = desk;
  const { calls, fresh } = await deskCalls(client);
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? null;

  return (
    <div className={wlSans.className}>
      <ClientDesk
        agency={{ name: agency.name, color: agency.color || '#1C0950', logo: agency.logo_url, website: agency.website }}
        client={{ id: client.id, business: client.business, agent: client.agent_name || 'Your receptionist', line: client.test_number }}
        deskKey={key as string}
        calls={calls}
        fresh={fresh}
        openCall={one(q.call) ?? null}
        voice={publicKey && client.vapi_assistant_id ? { publicKey, assistantId: client.vapi_assistant_id } : null}
      />
    </div>
  );
}
