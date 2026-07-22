import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { channelAuthUrl } from '@/lib/youtube';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Admin clicks "Connect the channel": bounce them to Google consent. */
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.redirect(`${SITE.url}/admin`);
  const url = channelAuthUrl();
  if (!url) return NextResponse.redirect(`${SITE.url}/admin/youtube?connect=unconfigured`);
  return NextResponse.redirect(url);
}
