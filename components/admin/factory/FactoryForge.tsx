'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Badge, Button, Card, Dial, Empty, Eyebrow, Notice, Page, PageTitle, Shell, Field, Stat,
  inputCls, money, num, sentenceCase,
} from './ui';

/**
 * CLIENT FACTORY FORGE.
 *
 * A URL, a handful of answers only the owner can give, and a reviewable
 * blueprint. This screen is the whole delivery model: if it works, a standard
 * deployment is configuration and validation instead of engineering.
 *
 * The order is deliberate. RESEARCH first, so the operator sees what the Forge
 * could read before being asked anything. Then CONFIRM what it found. Then
 * supply the facts no website carries: what a customer is worth, what the
 * packages cost, which address sends, who the AI hands to. Those five answers
 * are the entire human contribution to a standard Factory, and the screen says
 * so out loud.
 */

type Template = { key: string; name: string; vertical: string | null; blurb: string; channel: string; parent: string | null };
type Tenant = { id: string; name: string; plan_code: string | null; status: string; kind: string };

type ForgeResult = {
  research: { url: string; ok: boolean; error: string | null; title: string | null; description: string | null; headings: string[]; emails: string[]; phones: string[]; excerpt: string };
  recommendation: { key: string; name: string; confidence: string; why: string };
  templateKey: string;
  blueprint: Record<string, unknown> | null;
  issues: { path: string; message: string }[];
  complexity: { level: string; drivers: string[]; estimatedMinutes: number } | null;
  fit: { score: number; verdict: string; reasons: string[]; warning: string | null };
  fitNotes: string | null;
  outstanding: string[];
};

const toCents = (v: string): number | null => {
  const n = Number(v.replace(/[$,\s]/g, ''));
  return v.trim() === '' || !Number.isFinite(n) ? null : Math.round(n * 100);
};

export default function FactoryForge() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForgeResult | null>(null);

  const [url, setUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [notes, setNotes] = useState('');

  const [avgFirstSale, setAvgFirstSale] = useState('');
  const [lifetimeValue, setLifetimeValue] = useState('');
  const [closeRate, setCloseRate] = useState('');
  const [senderFrom, setSenderFrom] = useState('');
  const [postalAddress, setPostalAddress] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [packageName, setPackageName] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [addressable, setAddressable] = useState('');

  const [tenantId, setTenantId] = useState('');
  const [factoryName, setFactoryName] = useState('');

  useEffect(() => {
    void (async () => {
      const [a, b] = await Promise.all([fetch('/api/admin/factories/forge'), fetch('/api/admin/factories/tenants')]);
      if (a.ok) setTemplates((await a.json()).templates ?? []);
      if (b.ok) {
        const json = await b.json();
        setTenants((json.tenants ?? []).filter((t: Tenant) => t.status === 'active'));
      }
    })();
  }, []);

  const answers = useCallback(
    () => ({
      industry: industry || undefined,
      targetCustomer: targetCustomer || undefined,
      notes: notes || undefined,
      senderFrom: senderFrom || undefined,
      postalAddress: postalAddress || undefined,
      ownerEmail: ownerEmail || undefined,
      pricing: packageName ? [{ name: packageName, priceCents: toCents(packagePrice), cadence: 'quote' as const }] : undefined,
      economics: {
        avgFirstSaleCents: toCents(avgFirstSale),
        lifetimeValueCents: toCents(lifetimeValue),
        closeRatePct: closeRate.trim() === '' ? null : Number(closeRate),
      },
    }),
    [industry, targetCustomer, notes, senderFrom, postalAddress, ownerEmail, packageName, packagePrice, avgFirstSale, lifetimeValue, closeRate],
  );

  const forge = useCallback(async () => {
    if (!url.trim()) { setError('A website URL is where the Forge starts.'); return; }
    setBusy('forge');
    setError(null);
    try {
      const res = await fetch('/api/admin/factories/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          templateKey: templateKey || undefined,
          answers: answers(),
          addressableCount: addressable.trim() === '' ? null : Number(addressable.replace(/[,\s]/g, '')),
          demonstrable: true,
          repeatableSale: true,
          reachable: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'The Forge could not finish.');
      setResult(json);
      setTemplateKey(json.templateKey);
      if (!factoryName) setFactoryName(`${json.research.title?.split(/[|\-–]/)[0]?.trim() || 'New'} Factory`.slice(0, 60));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The Forge could not finish.');
    } finally {
      setBusy(null);
    }
  }, [url, templateKey, answers, addressable, factoryName]);

  const create = useCallback(async () => {
    if (!tenantId) { setError('Pick the customer this Factory belongs to.'); return; }
    if (!result?.blueprint) { setError('There is no valid blueprint to create from yet.'); return; }
    setBusy('create');
    setError(null);
    try {
      const res = await fetch('/api/admin/factories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: factoryName || 'Client Factory',
          templateKey: result.templateKey,
          overlay: result.blueprint,
          businessName: (result.blueprint as { business?: { name?: string } }).business?.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not create the Factory.');
      router.push(`/admin/factories/${json.factory.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the Factory.');
      setBusy(null);
    }
  }, [tenantId, factoryName, result, router]);

  const bp = result?.blueprint as BlueprintPreview | null | undefined;

  return (
    <Shell>
      <AdminHeader active="factories" title="Forge a Client Factory" />
      <Page>
        <PageTitle
          eyebrow="Client Factory Forge"
          title={<>A website goes in. A <em className="font-display italic">reviewable blueprint</em> comes out.</>}
          sub="The Forge reads their site, picks a template, and writes the configuration. You supply only the handful of facts no website carries."
        />

        {error && <Notice kind="bad">{error}</Notice>}

        <Card eyebrow="Step one" title="The business">
          <div className="space-y-5">
            <Field label="Their website" hint="The Forge reads it and writes the blueprint from what it actually says. Nothing is invented.">
              <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="acmeroofing.com" inputMode="url" autoComplete="off" />
            </Field>
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Industry" hint="Optional. Sharpens the template match.">
                <input className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Commercial roofing" />
              </Field>
              <Field label="Template" hint="Leave it on recommend and the Forge picks from what the site says.">
                <select className={inputCls} value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
                  <option value="">Recommend one</option>
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>{t.name}{t.channel !== 'stable' ? ` (${t.channel})` : ''}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Who should this Factory find?" hint="In their words. One or two sentences.">
              <textarea className={`${inputCls} min-h-[76px]`} value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} placeholder="Property managers with 50 to 500 units across Texas and Arizona." />
            </Field>
            <Field label="Anything else worth knowing">
              <textarea className={`${inputCls} min-h-[60px]`} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="flex flex-wrap items-center gap-4">
              <Button tone="primary" onClick={() => void forge()} disabled={busy !== null}>
                {busy === 'forge' ? 'Reading their site' : result ? 'Forge again' : 'Research and forge'}
              </Button>
              <span className="font-body text-[13px] text-[#3A362D]">Reads the site, picks a template, writes the blueprint. About twenty seconds.</span>
            </div>
          </div>
        </Card>

        <Card eyebrow="Step two" title="What only they know" right={<Badge tone="required">never guessed</Badge>}>
          <p className="font-body text-[15px] text-[#3A362D] mb-5 max-w-3xl leading-relaxed">
            No website carries these, and a made-up number becomes a claim in a real email signed by a real business. Leave any of them blank and preflight will name it before anything goes live.
          </p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            <Field label="Avg first sale" hint="What one new customer is worth on day one.">
              <input className={inputCls} value={avgFirstSale} onChange={(e) => setAvgFirstSale(e.target.value)} placeholder="8500" inputMode="decimal" />
            </Field>
            <Field label="Lifetime value" hint="Over the whole relationship, if they know it.">
              <input className={inputCls} value={lifetimeValue} onChange={(e) => setLifetimeValue(e.target.value)} placeholder="24000" inputMode="decimal" />
            </Field>
            <Field label="Close rate %" hint="Of the qualified leads they talk to.">
              <input className={inputCls} value={closeRate} onChange={(e) => setCloseRate(e.target.value)} placeholder="28" inputMode="decimal" />
            </Field>
            <Field label="Sends from" hint="Display name and address, exactly as it should appear.">
              <input className={inputCls} value={senderFrom} onChange={(e) => setSenderFrom(e.target.value)} placeholder="Dana at Acme <dana@acme.com>" />
            </Field>
            <Field label="Postal address" hint="Required on commercial email. It cannot be invented.">
              <input className={inputCls} value={postalAddress} onChange={(e) => setPostalAddress(e.target.value)} placeholder="1200 Main St, Phoenix AZ 85001" />
            </Field>
            <Field label="Escalates to" hint="Who the AI hands a live conversation to.">
              <input className={inputCls} value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="dana@acme.com" inputMode="email" />
            </Field>
            <Field label="Package name">
              <input className={inputCls} value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Full install" />
            </Field>
            <Field label="Package price" hint="Blank means quoted, not listed.">
              <input className={inputCls} value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Businesses matching the ICP" hint="An honest order of magnitude. It drives the fit score.">
              <input className={inputCls} value={addressable} onChange={(e) => setAddressable(e.target.value)} placeholder="12000" inputMode="numeric" />
            </Field>
          </div>
        </Card>

        {result && (
          <>
            <Card eyebrow="What the Forge read" title={result.research.title ?? result.research.url} right={<Badge tone={result.research.ok ? 'pass' : 'fail'}>{result.research.ok ? 'site read' : 'unreadable'}</Badge>}>
              {result.research.ok ? (
                <div className="space-y-2">
                  {result.research.description && <p className="font-body text-[15px] text-[#3A362D] leading-relaxed">{result.research.description}</p>}
                  {result.research.headings.length > 0 && (
                    <p className="font-mono text-[12px] text-[#5C5850] leading-relaxed">{result.research.headings.slice(0, 8).join('  ·  ')}</p>
                  )}
                </div>
              ) : (
                <Notice kind="bad">{result.research.error}</Notice>
              )}
              <p className="font-body text-[14px] text-[#3A362D] mt-4 pt-4 border-t-2 border-[#161616]/12 leading-relaxed">
                Template: <strong className="font-bold text-[#161616]">{result.recommendation.name}</strong>, {result.recommendation.confidence} confidence. {result.recommendation.why}
              </p>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card eyebrow="Should we sell this?" title="Client Factory fit">
                <div className="flex flex-wrap items-center gap-5">
                  <Dial score={result.fit.score} label={result.fit.verdict} />
                  <ul className="min-w-0 space-y-1.5">
                    {result.fit.reasons.map((r) => (
                      <li key={r} className="font-body text-[13px] text-[#3A362D] leading-snug">{r}</li>
                    ))}
                  </ul>
                </div>
                {result.fit.warning && <div className="mt-4"><Notice kind="bad">{result.fit.warning}</Notice></div>}
                {result.fitNotes && <p className="font-body text-[14px] text-[#3A362D] mt-4 italic leading-relaxed">{result.fitNotes}</p>}
              </Card>

              <Card eyebrow="What it will take us" title="Implementation">
                {result.complexity ? (
                  <>
                    <div className="grid grid-cols-2 gap-5">
                      <Stat
                        label="Level"
                        value={sentenceCase(result.complexity.level)}
                        tone={result.complexity.level === 'custom' ? 'bad' : result.complexity.level === 'advanced' ? 'warn' : 'good'}
                      />
                      <Stat label="Human minutes" value={num(result.complexity.estimatedMinutes)} sub="estimate, checked against the actual afterwards" />
                    </div>
                    <ul className="mt-4 pt-4 border-t-2 border-[#161616]/12 space-y-1.5">
                      {result.complexity.drivers.map((d) => (
                        <li key={d} className="font-body text-[13px] text-[#3A362D] leading-snug">{d}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Empty title="No blueprint to estimate from">Fix the issues below and forge again.</Empty>
                )}
              </Card>
            </div>

            {result.outstanding.length > 0 && (
              <Card tone="yellow" eyebrow="Before it can go live" title="Still needed from a human">
                <ul className="space-y-2">
                  {result.outstanding.map((q) => (
                    <li key={q} className="flex gap-2.5 font-body text-[15px] text-[#161616] leading-snug">
                      <span className="font-bold shrink-0" aria-hidden>&rsaquo;</span>{q}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {result.issues.length > 0 && (
              <Card eyebrow="Rejected" title="The blueprint did not validate">
                <ul className="space-y-1.5">
                  {result.issues.map((i) => (
                    <li key={`${i.path}:${i.message}`} className="font-mono text-[12px] text-[#8E1007]">{i.path}: {i.message}</li>
                  ))}
                </ul>
              </Card>
            )}

            {bp && <BlueprintSummary bp={bp} />}

            <Card eyebrow="Step three" title="Create it">
              <div className="grid md:grid-cols-2 gap-5 mb-5">
                <Field label="Customer" hint="The tenant this Factory belongs to. Isolation starts here.">
                  <select className={inputCls} value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                    <option value="">Pick a customer</option>
                    {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}{t.plan_code ? ` (${t.plan_code})` : ''}</option>)}
                  </select>
                </Field>
                <Field label="Factory name">
                  <input className={inputCls} value={factoryName} onChange={(e) => setFactoryName(e.target.value)} />
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  tone="primary"
                  onClick={() => void create()}
                  disabled={busy !== null || !result.blueprint || !tenantId}
                  title={!tenantId ? 'Pick a customer first' : !result.blueprint ? 'The blueprint has to validate first' : undefined}
                >
                  {busy === 'create' ? 'Creating' : 'Create the Factory'}
                </Button>
                <span className="font-body text-[13px] text-[#3A362D]">
                  Lands in draft and test mode. It cannot contact anybody until the checklist is clear.
                </span>
              </div>
            </Card>
          </>
        )}
      </Page>
    </Shell>
  );
}

/* ─────────────────────── blueprint preview ─────────────────────────── */

type BlueprintPreview = {
  business: { name: string; description: string | null; services: string[]; approved_claims: string[] };
  offer: { headline: string; ai_may_quote_price: boolean };
  icp: { label: string; industries: string[]; geographies: string[]; business_signals: string[] }[];
  pain: { primary: string; objections: { objection: string; response: string }[] };
  agent: { name: string; role: string; tools: string[] };
  campaigns: { name: string; hook: string; cta: string; sequence: { step: number; day_offset: number; subject: string; body: string }[] }[];
  value_actions: { key: string; label: string }[];
  modules: string[];
  economics: { avg_first_sale_cents: number | null; lifetime_value_cents: number | null };
};

function BlueprintSummary({ bp }: { bp: BlueprintPreview }) {
  const campaign = bp.campaigns[0];
  return (
    <Card
      eyebrow="The blueprint"
      title={bp.business.name}
      right={<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5C5850]">{bp.modules.length} modules</span>}
    >
      <div className="space-y-6">
        <div>
          {bp.business.description && <p className="font-body text-[15px] text-[#3A362D] leading-relaxed">{bp.business.description}</p>}
          <p className="font-display text-xl font-semibold text-[#161616] mt-3 leading-snug">{bp.offer.headline}</p>
          <p className="font-body text-[13px] text-[#5C5850] mt-1.5">
            The agent {bp.offer.ai_may_quote_price ? 'may quote approved package prices.' : 'may not quote price and routes pricing to a human.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 pt-5 border-t-2 border-[#161616]/12">
          <Block title="Ideal customer">
            {bp.icp.map((i) => (
              <p key={i.label} className="font-body text-[14px] text-[#3A362D] leading-snug">
                <strong className="font-bold text-[#161616]">{i.label}.</strong>{' '}
                {[...i.industries, ...i.geographies, ...i.business_signals].join(', ') || 'No criteria yet.'}
              </p>
            ))}
          </Block>
          <Block title="Buying pain">
            <p className="font-body text-[14px] text-[#3A362D] leading-snug">{bp.pain.primary}</p>
          </Block>
          <Block title="AI salesperson">
            <p className="font-body text-[14px] text-[#3A362D] leading-snug">
              <strong className="font-bold text-[#161616]">{bp.agent.name}</strong>, {bp.agent.role}. {bp.agent.tools.length} authorized tools.
            </p>
          </Block>
          <Block title="Value action">
            <p className="font-body text-[14px] text-[#3A362D] leading-snug">
              {bp.value_actions.length
                ? bp.value_actions.map((v) => v.label).join('; ')
                : 'None. It would ask for a meeting without doing anything for the prospect first.'}
            </p>
          </Block>
        </div>

        <Block title="Approved claims">
          {bp.business.approved_claims.length ? (
            <ul className="space-y-1">
              {bp.business.approved_claims.map((c) => (
                <li key={c} className="font-body text-[14px] text-[#3A362D] leading-snug">&ldquo;{c}&rdquo;</li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-[14px] text-[#8E1007] leading-snug">None. The agent would have nothing it is allowed to say.</p>
          )}
        </Block>

        {campaign && (
          <div className="rounded-xl border-2 border-[#161616] bg-[#FFFDF6] p-4">
            <Eyebrow>Campaign</Eyebrow>
            <h3 className="font-display text-xl font-semibold text-[#161616] mt-1">{campaign.name}</h3>
            <p className="font-body text-[14px] text-[#3A362D] mt-1.5 leading-snug"><strong className="font-bold">Hook.</strong> {campaign.hook}</p>
            <div className="mt-4 space-y-4">
              {campaign.sequence.map((s) => (
                <div key={s.step} className="pt-4 border-t-2 border-[#161616]/12 first:border-0 first:pt-0">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C4160B]">Step {s.step} · day {s.day_offset}</span>
                  <p className="font-sans text-[15px] font-bold text-[#161616] mt-1">{s.subject}</p>
                  <p className="font-body text-[14px] text-[#3A362D] mt-1 whitespace-pre-wrap leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5 pt-5 border-t-2 border-[#161616]/12">
          <Stat label="Avg first sale" value={money(bp.economics.avg_first_sale_cents)} size="sm" tone={bp.economics.avg_first_sale_cents === null ? 'muted' : 'ink'} />
          <Stat label="Lifetime value" value={money(bp.economics.lifetime_value_cents)} size="sm" tone={bp.economics.lifetime_value_cents === null ? 'muted' : 'ink'} />
        </div>
      </div>
    </Card>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#C4160B] mb-1.5">{title}</h4>
      {children}
    </div>
  );
}
