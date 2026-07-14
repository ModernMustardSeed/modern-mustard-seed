import { notFound } from 'next/navigation';
import SiteEditor from '@/components/admin/SiteEditor';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Edit site', noindex: true });
export const dynamic = 'force-dynamic';

export default async function EditSitePage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) notFound();

  const { projectId } = await params;
  const sb = getSupabase();
  if (!sb) notFound();

  const { data: project } = await sb
    .from('projects')
    .select('id, name, client_email, site_html, site_live_url')
    .eq('id', projectId)
    .maybeSingle();
  if (!project?.site_html) notFound();

  // Their logo and photos, so they are one click away while editing rather than
  // buried in an inbox.
  const { data: order } = await sb
    .from('demo_orders')
    .select('intake')
    .eq('project_id', projectId)
    .maybeSingle();
  const raw = (order?.intake as Record<string, unknown> | null)?.assets;
  const assets = Array.isArray(raw) ? (raw as Array<{ url: string; name: string; kind: string }>) : [];

  return (
    <SiteEditor
      projectId={project.id as string}
      projectName={String(project.name ?? 'Their site')}
      initialHtml={String(project.site_html)}
      assets={assets}
      liveUrl={(project.site_live_url as string | null) ?? null}
    />
  );
}
