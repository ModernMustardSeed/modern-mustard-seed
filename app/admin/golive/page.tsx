import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { listRunbooks, progressOf } from '@/lib/golive';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Go-Live' };

export default async function GolivePage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  const runbooks = await listRunbooks();

  return (
    <main className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#C4160B]">Go-Live</p>
            <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Are We Done?</h1>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-[#161616]/70">
              One runbook per project: every step to launch, who owns it, links inline.
              Checks save to the database, so they follow you everywhere and agents mark
              their own items off as they finish.
            </p>
          </div>
          <Link href="/admin" className="shrink-0 font-mono text-xs text-[#1E50C8] underline underline-offset-4">
            ← Admin
          </Link>
        </div>

        {runbooks.length === 0 ? (
          <div className="mt-10 border-2 border-[#161616] bg-white p-8 shadow-[4px_4px_0_0_#161616]">
            <p className="font-semibold">No runbooks yet.</p>
            <p className="mt-2 text-sm text-[#161616]/70">
              In Claude Code, run the <span className="font-mono">golive</span> skill on any
              project. It scans the repo and files the runbook here.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5">
            {runbooks.map((rb) => {
              const p = progressOf(rb);
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              const ready = p.done === p.total && p.total > 0;
              return (
                <Link
                  key={rb.slug}
                  href={`/admin/golive/${rb.slug}`}
                  className="block border-2 border-[#161616] bg-white p-6 no-underline shadow-[4px_4px_0_0_#161616] transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="font-display text-2xl font-bold text-[#161616]">{rb.title}</span>
                    <span
                      className="border-2 border-[#161616] px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide"
                      style={{ background: ready ? '#F5B700' : '#FBF6EA' }}
                    >
                      {ready ? 'Ready To Go Live' : `${p.done}/${p.total} Done`}
                    </span>
                  </div>
                  {rb.subtitle && <p className="mt-1.5 text-sm text-[#161616]/70">{rb.subtitle}</p>}
                  <div className="mt-4 h-3 border-2 border-[#161616] p-[2px]">
                    <div className="h-full bg-[#F5B700]" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-[#161616]/60">
                    Yours {p.yoursDone}/{p.yoursTotal} · updated{' '}
                    {new Date(rb.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
