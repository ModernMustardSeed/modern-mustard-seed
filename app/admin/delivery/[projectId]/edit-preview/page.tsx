import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Preview edit', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * Preview a client's auto-applied edit before approving it. Shows the DRAFT
 * (site_html_draft), never the live site, in a sandboxed frame so its scripts can
 * never touch the admin. Approve and Discard live back on /admin/delivery.
 */
export default async function EditPreviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) notFound();

  const { projectId } = await params;
  const sb = getSupabase();
  if (!sb) notFound();

  const { data: project } = await sb
    .from('projects')
    .select('id, name, site_html_draft, edit_instruction, edit_status')
    .eq('id', projectId)
    .maybeSingle();
  if (!project?.site_html_draft) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-[#161616]">
      <header className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 border-b border-white/10">
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold">Edit preview (draft)</span>
          <p className="font-sans text-sm text-white truncate">{String(project.name ?? 'Their site')}</p>
        </div>
        {project.edit_instruction && (
          <p className="font-body text-[13px] text-white/60 min-w-0 flex-1 truncate">
            They asked: &ldquo;{String(project.edit_instruction)}&rdquo;
          </p>
        )}
        <Link
          href="/admin/delivery"
          className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg px-4 py-2"
        >
          Approve or discard on the board →
        </Link>
      </header>
      <iframe
        // sandbox="" = no scripts, no forms, no navigation. It is a picture of the draft.
        sandbox=""
        srcDoc={String(project.site_html_draft)}
        title="Edited draft preview"
        className="flex-1 w-full bg-white block"
      />
    </div>
  );
}
