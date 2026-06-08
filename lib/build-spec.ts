import { getSupabase } from '@/lib/supabase';
import { byId } from '@/data/proposal-menu';
import { selectSections } from '@/lib/intake';

/**
 * Assemble a complete build brief for a client from everything on file: their
 * scope (proposal services + scopes), brand (intake brand answers), the full
 * intake, and their files. This is the spec a Claude Code worker builds from.
 */
const BRAND = {
  note: 'Modern Mustard Seed house standard (apply unless the client brand says otherwise): production-grade, distinctive, never generic-AI. Accessible, mobile-fast, Lighthouse 90+. Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase/Stripe where needed, deploy on Vercel.',
};

const TYPE_GUIDANCE: Record<string, string> = {
  website: 'Build a production website. Real copy written for the business, responsive, SEO + structured data, fast. Deploy to Vercel and return the live URL.',
  app: 'Build a working web app to the scope. Auth and data where needed (Supabase). Deploy to Vercel, return the live URL and the repo.',
  tool: 'Build the specialty tool/utility described. Keep it focused and usable. Deploy and return the live URL.',
  software: 'Build the software/system to the scope. Document setup and hand off the repo. Deploy any user-facing surface.',
  brand_bible: 'Produce a brand bible: logo usage, palette with hex, type system, voice, do/don\'t, and example applications. Deliver as a PDF and a shareable page.',
  other: 'Build the deliverable described in the scope. Use judgment, keep it production-grade.',
};

export async function assembleBuildSpec(args: {
  email: string;
  deliverableType: string;
  title: string;
}): Promise<{ spec: string; projectId: string | null }> {
  const supabase = getSupabase();
  const email = args.email.toLowerCase().trim();
  const L: string[] = [];
  let projectId: string | null = null;

  L.push(`# BUILD BRIEF — ${args.title}`);
  L.push(`Deliverable type: ${args.deliverableType}`);
  L.push(`Client email: ${email}`);
  L.push('');
  L.push(`## How to build`);
  L.push(TYPE_GUIDANCE[args.deliverableType] ?? TYPE_GUIDANCE.other);
  L.push(BRAND.note);
  L.push('');

  if (!supabase) {
    return { spec: L.join('\n'), projectId: null };
  }

  // Client + project
  try {
    const { data: c } = await supabase.from('clients').select('name, company').eq('email', email).maybeSingle();
    if (c) L.push(`## Client\n${c.name ?? ''}${c.company ? ` — ${c.company}` : ''}`);
  } catch { /* ignore */ }
  try {
    const { data: proj } = await supabase
      .from('projects')
      .select('id, name, summary, milestones')
      .ilike('client_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (proj) {
      projectId = proj.id as string;
      L.push(`\n## Project\n${proj.name as string}`);
      if (proj.summary) L.push(`${proj.summary as string}`);
      const ms = Array.isArray(proj.milestones) ? (proj.milestones as Array<{ title: string }>) : [];
      if (ms.length) L.push(`Milestones: ${ms.map((m) => m.title).join('; ')}`);
    }
  } catch { /* ignore */ }

  // Scope from the proposal
  let serviceIds: string[] = [];
  try {
    const { data: p } = await supabase
      .from('proposals')
      .select('lines, situation, prose')
      .ilike('client_email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (p) {
      const lines = Array.isArray(p.lines) ? (p.lines as Array<{ id?: string; scope?: string[]; framing?: string }>) : [];
      serviceIds = lines.map((l) => l.id).filter((x): x is string => !!x);
      if (p.situation) L.push(`\n## Situation\n${p.situation as string}`);
      if (lines.length) {
        L.push(`\n## Scope (from the proposal)`);
        for (const l of lines) {
          const s = l.id ? byId(l.id) : undefined;
          L.push(`\n### ${s?.name ?? l.id}`);
          if (l.framing) L.push(l.framing);
          for (const b of l.scope ?? s?.scope ?? []) L.push(`- ${b}`);
        }
      }
    }
  } catch { /* ignore */ }

  // Intake answers (brand, domain, content, etc.)
  try {
    const { data: intake } = await supabase.from('client_intake').select('answers').ilike('client_email', email).maybeSingle();
    const answers = (intake?.answers as Record<string, string>) ?? {};
    if (Object.keys(answers).length) {
      const sections = selectSections(serviceIds);
      L.push(`\n## Client intake (their answers)`);
      for (const sec of sections) {
        const rows = sec.fields.filter((f) => (answers[f.key] ?? '').toString().trim());
        if (!rows.length) continue;
        L.push(`\n### ${sec.title}`);
        for (const f of rows) L.push(`- ${f.label}: ${answers[f.key]}`);
      }
    }
  } catch { /* ignore */ }

  // Files / assets
  try {
    const { data: files } = await supabase.from('client_files').select('label, url, kind').ilike('client_email', email);
    if (files?.length) {
      L.push(`\n## Assets and links on file`);
      for (const f of files) L.push(`- [${f.kind}] ${f.label}: ${f.url}`);
    }
  } catch { /* ignore */ }

  L.push(`\n## Deliver`);
  L.push('When done: deploy any user-facing surface to Vercel, then report back the live URL, the repo, and a one-line summary. These get posted to the client\'s portal automatically.');

  return { spec: L.join('\n'), projectId };
}
