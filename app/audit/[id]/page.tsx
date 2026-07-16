import Link from 'next/link';
import { notFound } from 'next/navigation';
import AuditReport, { type AuditReportData } from '@/components/AuditReport';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';

// Per-lead reports are private links, never indexed. Always fresh so a re-run
// audit shows the latest.
export const dynamic = 'force-dynamic';
export const metadata = buildMetadata({
  title: 'Your Website Audit',
  description: 'A real, multi-category audit of your website, graded by Claude across brand, trust, SEO, GEO, conversion, and design.',
  path: '/audit',
  noindex: true,
});

type Params = Promise<{ id: string }>;

export default async function LeadAuditReportPage({ params }: { params: Params }) {
  const { id } = await params;
  // Reports are keyed by the lead UUID; anything else is a bad link.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const supabase = getSupabase();
  if (!supabase) notFound();

  // ONLY the audit-facing fields — never phone, notes, owner, or pipeline data.
  const { data: lead } = await supabase
    .from('outbound_leads')
    .select('business_name, contact_name, website, audit_url, audit_score, audit_json, audit_at')
    .eq('id', id)
    .maybeSingle();

  if (!lead) notFound();

  const firstName = (lead.contact_name || '').trim().split(' ')[0] || '';
  const business = lead.business_name || 'your business';

  // Lead exists but no audit has been run yet: a calm holding page, not a 404.
  if (!lead.audit_json) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center px-6 py-24">
        <div className="pop-card p-10 md:p-14 text-center max-w-lg">
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-4">Website audit</span>
          <h1 className="font-display text-3xl md:text-4xl text-[#161616] font-black tracking-tight mb-3">Your report is being prepared.</h1>
          <p className="text-[#3a3733] font-body leading-relaxed mb-8">
            We&apos;re still grading {business}. Check back shortly, or run the audit yourself right now and see your score in about a minute.
          </p>
          <Link href="/website-audit" className="inline-flex items-center justify-center bg-[#161616] text-[#FBF6EA] font-display font-black tracking-tight px-6 py-3 rounded-lg border-2 border-[#161616] hover:bg-[#E0301E] transition-colors">
            Run the free audit &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const report = lead.audit_json as AuditReportData;
  const score = lead.audit_score ?? Math.round(report.overall_score);

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24">
        {/* Header */}
        <header className="text-center mb-14 md:mb-20">
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-4">A website audit for</span>
          <h1 className="font-display text-4xl md:text-6xl text-[#161616] font-black tracking-tight leading-[1.05]">{business}</h1>
          <p className="text-[#3a3733] font-body text-base md:text-lg leading-relaxed max-w-2xl mx-auto mt-5">
            {firstName ? `${firstName}, we` : 'We'} ran your website through a real, multi-category audit graded by Claude across brand,
            trust, SEO, GEO and AI search, conversion, and design. Here is the whole thing, no email required.
          </p>
        </header>

        {/* The report */}
        <AuditReport report={report} auditedUrl={lead.audit_url || lead.website} />

        {/* Conversion CTA */}
        <div className="pop-card-yellow p-8 md:p-12 mt-14 md:mt-20 text-center">
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#161616] font-mono font-bold block mb-3">The A version</span>
          <h2 className="font-display text-3xl md:text-4xl text-[#161616] font-black tracking-tight mb-3">
            Want us to fix {score < 80 ? 'these' : 'the last few'} for you?
          </h2>
          <p className="text-[#161616]/80 font-body font-medium leading-relaxed max-w-xl mx-auto mb-7">
            This is the exact audit we run on paying clients. If you want the score above turned into a site that actually earns,
            grab 10 minutes with Sarah. No pitch deck, just what we&apos;d build and what it costs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/?book=1" className="inline-flex items-center justify-center bg-[#161616] text-[#FBF6EA] font-display font-black tracking-tight px-7 py-3.5 rounded-lg border-2 border-[#161616] hover:bg-[#E0301E] transition-colors">
              Book 10 minutes with Sarah &rarr;
            </Link>
            <Link href="/website-audit" className="inline-flex items-center justify-center bg-white text-[#161616] font-display font-black tracking-tight px-7 py-3.5 rounded-lg border-2 border-[#161616] hover:bg-[#F5B700] transition-colors">
              Audit another site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
