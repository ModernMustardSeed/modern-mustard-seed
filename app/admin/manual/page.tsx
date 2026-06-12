import AdminHeader from '@/components/admin/AdminHeader';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: "Operator's Manual", noindex: true });

// The MMS studio-OS operator's manual: what the machine does on its own,
// what every tab is for, and the client lifecycle end to end.
export default function AdminManualPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="manual" title="Operator's Manual" />

      <main className="mx-auto max-w-3xl px-5 py-10 md:px-6">
        <header className="rounded-2xl border-2 border-[#161616] bg-[#161616] p-8 text-[#FBF6EA] shadow-[4px_4px_0_0_#F5B700]">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#F5B700]">
            Modern Mustard Seed
          </p>
          <h1 className="mt-3 font-display text-3xl">The Studio OS, explained</h1>
          <p className="mt-2 max-w-lg text-sm text-[#FBF6EA]/75">
            What this machine does while you sleep, what every tab is for, and the lifecycle a client travels from
            first click to case study. For Sarah, and whoever she trusts to drive next.
          </p>
        </header>

        <Section n="1" title="The machine">
          <ul>
            <li><strong>The marketing site</strong> (modernmustardseed.com): positioning, blog, case studies, playbooks, full SEO/GEO stack.</li>
            <li><strong>The funnels</strong>: the AI Audit tool (/audit, Claude-powered, feeds Harvest), Mr. Mustard chat + the Vapi voice agent (both book discovery calls), the playbook store (/store, native Stripe), lead magnets and the newsletter.</li>
            <li><strong>The studio OS</strong> (/admin): pipeline, proposals with Stripe billing, client projects + portals, the headless build worker, partner program, outreach CRM.</li>
          </ul>
        </Section>

        <Section n="2" title="What runs on its own">
          <ol>
            <li><strong>Mr. Mustard + the voice agent</strong> answer and book calls 24/7; bookings hit the Calendar and send confirmations.</li>
            <li><strong>Cron: booking-reminders</strong> chases upcoming calls so no-shows stay rare.</li>
            <li><strong>Cron: mustard-sequence</strong> runs the email nurture for new leads.</li>
            <li><strong>Cron: newsletter</strong> handles the list sends.</li>
            <li><strong>Cron: outreach-cadence</strong> advances outreach follow-ups on schedule.</li>
            <li><strong>Cron: commissions</strong> tallies partner earnings.</li>
            <li><strong>Cron: operator</strong> is the daily ops sweep.</li>
            <li><strong>The build worker</strong> (`node scripts/build-worker.mjs`) runs Claude Code headless against the build queue: client builds happen while you do something else.</li>
            <li><strong>Audit submissions</strong> flow into Harvest and the Pipeline automatically.</li>
          </ol>
        </Section>

        <Section n="3" title="Admin, tab by tab">
          <Sub title="Overview">The morning glance: pipeline, money, today.</Sub>
          <Sub title="Calendar">Discovery calls and bookings (Mr. Mustard, voice agent, and site bookings land here).</Sub>
          <Sub title="Approvals">Anything queued that needs your yes before it ships or sends.</Sub>
          <Sub title="Pipeline">The lead CRM. Same rule you give clients: touch new leads fast, keep statuses honest.</Sub>
          <Sub title="Audit">AI audit submissions and their reports; these are warm leads, not paperwork.</Sub>
          <Sub title="Call">The intake-call companion: script, notes, and capture during discovery calls.</Sub>
          <Sub title="Proposals">Build, send, and bill. Stripe payment links ride along; accepted work becomes a Project.</Sub>
          <Sub title="Projects">Active engagements and their client portals.</Sub>
          <Sub title="Builds">The build queue the worker consumes; watch progress, review output.</Sub>
          <Sub title="Reviews">Testimonials in, social proof out.</Sub>
          <Sub title="Outreach">Cold/warm outreach CRM; the cadence cron moves it.</Sub>
          <Sub title="Partners">Referral partners and their commissions.</Sub>
          <Sub title="Onboarding">New-client kickoff flow.</Sub>
        </Section>

        <Section n="4" title="The client lifecycle">
          <ol>
            <li>They find the site (SEO/GEO, content, ads) and hit the <strong>Audit</strong> or book a <strong>call</strong>.</li>
            <li>Discovery call runs with the <strong>Call</strong> companion; lead advances in <strong>Pipeline</strong>.</li>
            <li><strong>Proposal</strong> goes out with Stripe billing attached; yes = paid + a <strong>Project</strong>.</li>
            <li>Work ships via the <strong>build worker</strong> and lands in their <strong>portal</strong>; for client businesses, finish with the <strong>client-handoff package</strong> (/welcome page + owner&rsquo;s manual, see the client-handoff skill; canonical: bare-earth).</li>
            <li>Close the loop: <strong>Review</strong> request, then case study, then referral ask (<strong>Partners</strong>).</li>
          </ol>
        </Section>

        <Section n="5" title="The weekly rhythm">
          <ul>
            <li><strong>Daily:</strong> Overview + Calendar; touch every new Pipeline lead and Audit submission.</li>
            <li><strong>Per call:</strong> same-day proposal while it&rsquo;s warm.</li>
            <li><strong>Weekly:</strong> Approvals sweep, Builds review, outreach replies, Reviews chase.</li>
            <li><strong>Monthly:</strong> partner commissions, content/SEO review, prune the pipeline honestly.</li>
          </ul>
        </Section>

        <Section n="6" title="Keys & services">
          <ul>
            <li><strong>Supabase</strong> (data) · <strong>Stripe</strong> (store + proposal billing) · <strong>Resend</strong> (email) · <strong>Vapi</strong> (voice) · <strong>Anthropic</strong> (audit, Mr. Mustard, build worker) · <strong>Vercel</strong> (hosting).</li>
            <li>Structural changes: open a Claude Code session in <code>~/modern-mustard-seed</code>; prod deploys from <code>master</code>.</li>
          </ul>
        </Section>
      </main>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[4px_4px_0_0_#161616]">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#E0301E]">Section {n}</p>
      <h2 className="mt-1.5 font-display text-2xl text-[#161616]">{title}</h2>
      <div className="mt-3 space-y-3 text-[0.93rem] leading-relaxed text-[#161616]/80 [&_code]:rounded [&_code]:bg-[#FBF6EA] [&_code]:px-1 [&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-[#161616] [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 border-l-4 border-[#F5B700] pl-4">
      <h3 className="font-sans text-sm font-bold uppercase tracking-wide text-[#161616]">{title}</h3>
      <div className="mt-0.5 text-sm leading-relaxed text-[#161616]/75">{children}</div>
    </div>
  );
}
