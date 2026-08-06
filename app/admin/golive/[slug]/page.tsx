import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { getRunbook } from '@/lib/golive';
import GoliveRunbookView from '@/components/admin/GoliveRunbook';

export const dynamic = 'force-dynamic';

export default async function GoliveDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  const { slug } = await params;
  const rb = await getRunbook(slug);
  if (!rb) notFound();

  return (
    <main className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin/golive" className="font-mono text-xs text-[#1E50C8] underline underline-offset-4">
            ← All Runbooks
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#C4160B]">Go-Live Runbook</span>
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">{rb.title}</h1>
        {rb.subtitle && <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-[#161616]/70">{rb.subtitle}</p>}
        <p className="mt-2 font-mono text-[11px] text-[#161616]/60">
          {rb.repo_path && <span>{rb.repo_path}</span>}
          {rb.prod_url && (
            <>
              {rb.repo_path && <span className="mx-2 opacity-50">|</span>}
              <a href={rb.prod_url} target="_blank" rel="noopener noreferrer" className="text-[#1E50C8] underline underline-offset-4">
                {rb.prod_url.replace(/^https?:\/\//, '')}
              </a>
            </>
          )}
        </p>
        <GoliveRunbookView runbook={rb} />
      </div>
    </main>
  );
}
