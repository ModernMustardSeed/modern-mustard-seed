import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFactoryAdmin } from '@/lib/factory/tenant';
import { parseJson, bad } from '@/lib/factory/server';
import { researchBusiness, recommendTemplate, forgeBlueprint, outstandingQuestions } from '@/lib/factory/forge';
import { fitScore, implementationComplexity } from '@/lib/factory/productization';
import { offerableTemplates } from '@/lib/factory/templates';
import { capabilityMap } from '@/lib/factory/modules';
import { audit } from '@/lib/factory/audit-log';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** What the wizard needs to render step one: templates and the capability map. */
export async function GET() {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  return NextResponse.json({
    templates: offerableTemplates(true).map((t) => ({
      key: t.key, name: t.name, vertical: t.vertical, blurb: t.blurb, channel: t.channel, parent: t.parent,
    })),
    capabilities: capabilityMap(),
  });
}

const answersSchema = z.object({
  businessName: z.string().trim().max(200).optional(),
  website: z.string().trim().max(300).optional(),
  industry: z.string().trim().max(120).optional(),
  serviceArea: z.string().trim().max(300).optional(),
  targetCustomer: z.string().trim().max(600).optional(),
  offerHeadline: z.string().trim().max(300).optional(),
  pricing: z.array(z.object({
    name: z.string().trim().min(1).max(160),
    priceCents: z.number().int().min(0).max(100_000_000).nullable(),
    cadence: z.enum(['one_time', 'monthly', 'annual', 'quote']),
  })).max(20).optional(),
  economics: z.object({
    avgFirstSaleCents: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
    avgRecurringCents: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
    lifetimeValueCents: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
    closeRatePct: z.number().min(0).max(100).nullable().optional(),
    salesCycleDays: z.number().int().min(0).max(3650).nullable().optional(),
    qualifiedLeadValueCents: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
    targetCacCents: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  }).optional(),
  senderFrom: z.string().trim().max(200).optional(),
  postalAddress: z.string().trim().max(300).optional(),
  ownerEmail: z.string().trim().max(200).optional(),
  approvedClaims: z.array(z.string().trim().max(400)).max(30).optional(),
  prohibitedClaims: z.array(z.string().trim().max(400)).max(30).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const forgeSchema = z.object({
  url: z.string().trim().min(3).max(300),
  templateKey: z.string().trim().max(80).optional(),
  answers: answersSchema.default({}),
  /** Estimate of how many businesses match the ICP. Feeds the fit score. */
  addressableCount: z.number().int().min(0).max(50_000_000).nullable().optional(),
  reachable: z.boolean().nullable().optional(),
  repeatableSale: z.boolean().nullable().optional(),
  demonstrable: z.boolean().nullable().optional(),
});

/**
 * FORGE CLIENT FACTORY.
 *
 * A URL and a handful of answers become a validated blueprint, a template
 * recommendation, a fit score, a complexity estimate and an explicit list of
 * what a human still has to supply.
 *
 * IT DOES NOT CREATE ANYTHING. This route returns a document for review. The
 * operator reads it, corrects it, and POSTs to /api/admin/factories to create
 * the Factory. Generation and creation are separated on purpose: a wizard that
 * wrote to the database on every keystroke would leave half-built Factories
 * behind every time somebody changed their mind.
 */
export async function POST(req: Request) {
  const guard = await requireFactoryAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseJson(req, forgeSchema);
  if ('error' in parsed) return parsed.error;
  const input = parsed.data;

  const research = await researchBusiness(input.url);
  const recommendation = recommendTemplate(research, input.answers.industry ?? null);

  const forged = await forgeBlueprint({
    research,
    answers: { ...input.answers, website: input.answers.website ?? research.url },
    templateKey: input.templateKey ?? recommendation.key,
  });

  if (!forged.ok) {
    return NextResponse.json(
      { error: forged.error, queuedJobId: forged.queuedJobId ?? null, research: summarize(research), recommendation },
      { status: forged.queuedJobId ? 202 : 400 },
    );
  }

  const econ = input.answers.economics ?? {};
  const fit = fitScore({
    customerValueCents: econ.avgFirstSaleCents ?? null,
    lifetimeValueCents: econ.lifetimeValueCents ?? null,
    addressableCount: input.addressableCount ?? null,
    reachable: input.reachable ?? null,
    repeatableSale: input.repeatableSale ?? null,
    demonstrable: input.demonstrable ?? null,
    salesCycleDays: econ.salesCycleDays ?? null,
    regulated: forged.result.ok ? forged.result.doc.compliance.regulated_vertical : false,
    integrationCount: forged.result.ok ? forged.result.doc.integrations.length : 0,
  });

  await audit(guard.supabase, {
    actor: guard.user.email,
    actorKind: 'admin',
    action: 'blueprint.generated',
    target: research.url,
    meta: { template: forged.templateKey, fit: fit.score, valid: forged.result.ok },
  });

  return NextResponse.json({
    research: summarize(research),
    recommendation,
    templateKey: forged.templateKey,
    blueprint: forged.result.ok ? forged.result.doc : null,
    issues: forged.result.ok ? [] : forged.result.errors,
    complexity: forged.result.ok ? implementationComplexity(forged.result.doc) : null,
    fit,
    fitNotes: forged.fitNotes,
    outstanding: outstandingQuestions(input.answers, forged.missing),
  });
}

function summarize(r: Awaited<ReturnType<typeof researchBusiness>>) {
  return {
    url: r.url,
    ok: r.ok,
    error: r.error ?? null,
    title: r.title,
    description: r.description,
    headings: r.headings.slice(0, 12),
    emails: r.emails,
    phones: r.phones,
    excerpt: r.text.slice(0, 1200),
  };
}
