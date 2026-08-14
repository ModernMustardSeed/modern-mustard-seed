'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import { Badge, Bar, Button, Card, Empty, Field, Stat, inputCls, money } from './ui';

/**
 * CLIENT FACTORY FORGE.
 *
 * A URL, a handful of answers only the owner can give, and a reviewable
 * blueprint. This screen is the whole delivery model: if it works, a standard
 * deployment is configuration and validation instead of engineering.
 *
 * The order matters. RESEARCH first, so the operator sees what the Forge could
 * read before being asked anything. Then CONFIRM what it found. Then supply the
 * facts no website carries: what a customer is worth, what the packages cost,
 * which address sends, who the AI hands to. Those five answers are the entire
 * human contribution to a standard Factory, and the screen says so.
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

type Money = number | null;
const toCents = (v: string): Money => {
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

  // Step 1: what we ask before reading the site.
  const [url, setUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2: the facts only a human has.
  const [avgFirstSale, setAvgFirstSale] = useState('');
  const [lifetimeValue, setLifetimeValue] = useState('');
  const [closeRate, setCloseRate] = useState('');
  const [senderFrom, setSenderFrom] = useState('');
  const [postalAddress, setPostalAddress] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [packageName, setPackageName] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [addressable, setAddressable] = useState('');

  // Step 3: where it lands.
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
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="factories" title="Forge a Client Factory" />

      <main className="max-w-5xl mx-auto px-5 md:px-6 py-6 space-y-5">
        {error && <div className="border-2 border-[#E0301E] bg-[#E0301E]/[0.06] rounded-xl px-4 py-3 text-sm text-[#E0301E]">{error}</div>}

        <Card title="1. The business">
          <div className="space-y-4">
            <Field label="Their website" hint="The Forge reads it and writes the blueprint from what it actually says.">
              <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="acmeroofing.com" />
            </Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Industry" hint="Optional. Sharpens the template match.">
                <input className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Commercial roofing" />
              </Field>
              <Field label="Template" hint="Leave blank and the Forge recommends one.">
                <select className={inputCls} value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
                  <option value="">Recommend one</option>
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>{t.name}{t.channel !== 'stable' ? ` (${t.channel})` : ''}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Who should this Factory find?" hint="In their words. One or two sentences.">
              <textarea className={`${inputCls} min-h-[68px]`} value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} placeholder="Property managers with 50 to 500 units across Texas and Arizona." />
            </Field>
            <Field label="Anything else worth knowing">
              <textarea className={`${inputCls} min-h-[52px]`} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="flex items-center gap-3">
              <Button tone="primary" onClick={() => void forge()} disabled={busy !== null}>
                {busy === 'forge' ? 'Reading their site…' : result ? 'Forge again' : 'Research and forge'}
              </Button>
              <span className="text-xs text-[#161616]/45">Reads the site, picks a template, writes the blueprint. About twenty seconds.</span>
            </div>
          </div>
        </Card>

        <Card title="2. What only they know" right={<span className="font-mono text-[9px] text-[#161616]/40">Never guessed</span>}>
          <p className="text-xs text-[#161616]/55 mb-4">
            No website carries these, and a made-up number becomes a claim in a real email. Blank is fine: preflight will name what is missing before anything goes live.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Avg first sale" hint="What one new customer is worth on day one.">
              <input className={inputCls} value={avgFirstSale} onChange={(e) => setAvgFirstSale(e.target.value)} placeholder="8500" inputMode="decimal" />
            </Field>
            <Field label="Lifetime value" hint="Over the whole relationship, if known.">
              <input className={inputCls} value={lifetimeValue} onChange={(e) => setLifetimeValue(e.target.value)} placeholder="24000" inputMode="decimal" />
            </Field>
            <Field label="Close rate %" hint="Of qualified leads they talk to.">
              <input className={inputCls} value={closeRate} onChange={(e) => setCloseRate(e.target.value)} placeholder="28" inputMode="decimal" />
            </Field>
            <Field label="Sends from" hint="Display name and address.">
              <input className={inputCls} value={senderFrom} onChange={(e) => setSenderFrom(e.target.value)} placeholder="Dana at Acme <dana@acme.com>" />
            </Field>
            <Field label="Postal address" hint="Required on commercial email. Cannot be invented.">
              <input className={inputCls} value={postalAddress} onChange={(e) => setPostalAddress(e.target.value)} />
            </Field>
            <Field label="Escalates to" hint="Who the AI hands a live conversation to.">
              <input className={inputCls} value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="dana@acme.com" />
            </Field>
            <Field label="Package name">
              <input className={inputCls} value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Full install" />
            </Field>
            <Field label="Package price" hint="Blank means quoted, not listed.">
              <input className={inputCls} value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label="Businesses matching the ICP" hint="An honest order of magnitude. Feeds the fit score.">
              <input className={inputCls} value={addressable} onChange={(e) => setAddressable(e.target.value)} placeholder="12000" inputMode="numeric" />
            </Field>
          </div>
        </Card>

        {result && (
          <>
            <Card title="What the Forge read" right={<Badge tone={result.research.ok ? 'pass' : 'fail'}>{result.research.ok ? 'site read' : 'unreadable'}</Badge>}>
              {result.research.ok ? (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-[#161616]">{result.research.title ?? result.research.url}</p>
                  {result.research.description && <p className="text-[#161616]/65">{result.research.description}</p>}
                  {result.research.headings.length > 0 && (
                    <p className="text-xs text-[#161616]/50">{result.research.headings.slice(0, 8).join(' · ')}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#E0301E]">{result.research.error}</p>
              )}
              <p className="text-xs text-[#161616]/50 mt-3">
                Template: <strong className="text-[#161616]">{result.recommendation.name}</strong> ({result.recommendation.confidence} confidence). {result.recommendation.why}
              </p>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Client Factory fit">
                <div className="flex items-center gap-4 mb-3">
                  <Stat
                    label="Fit"
                    value={`${result.fit.score}`}
                    tone={result.fit.verdict === 'poor' ? 'bad' : result.fit.verdict === 'marginal' ? 'warn' : 'good'}
                    sub={result.fit.verdict}
                  />
                  <div className="flex-1"><Bar pct={result.fit.score} tone={result.fit.score < 40 ? 'bad' : result.fit.score < 60 ? 'warn' : 'good'} /></div>
                </div>
                {result.fit.warning && (
                  <p className="text-sm text-[#E0301E] border-2 border-[#E0301E] bg-[#E0301E]/[0.06] rounded-lg px-3 py-2 mb-3">{result.fit.warning}</p>
                )}
                <ul className="space-y-1">
                  {result.fit.reasons.map((r) => <li key={r} className="text-xs text-[#161616]/65">{r}</li>)}
                </ul>
                {result.fitNotes && <p className="text-xs text-[#161616]/70 mt-3 italic">{result.fitNotes}</p>}
              </Card>

              <Card title="Implementation">
                {result.complexity ? (
                  <>
                    <div className="flex items-center gap-4 mb-3">
                      <Stat label="Level" value={result.complexity.level} tone={result.complexity.level === 'custom' ? 'bad' : result.complexity.level === 'advanced' ? 'warn' : 'good'} />
                      <Stat label="Est. human minutes" value={result.complexity.estimatedMinutes} sub="estimate" />
                    </div>
                    <ul className="space-y-1">
                      {result.complexity.drivers.map((d) => <li key={d} className="text-xs text-[#161616]/65">{d}</li>)}
                    </ul>
                  </>
                ) : (
                  <Empty>No blueprint to estimate from.</Empty>
                )}
              </Card>
            </div>

            {result.outstanding.length > 0 && (
              <Card title="Still needed from a human">
                <ul className="space-y-1.5">
                  {result.outstanding.map((q) => (
                    <li key={q} className="text-sm text-[#161616]/75 flex gap-2">
                      <span className="text-[#F5B700] shrink-0">▸</span>{q}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {result.issues.length > 0 && (
              <Card title="The blueprint did not validate">
                <ul className="space-y-1">
                  {result.issues.map((i) => (
                    <li key={`${i.path}:${i.message}`} className="text-xs font-mono text-[#E0301E]">{i.path}: {i.message}</li>
                  ))}
                </ul>
              </Card>
            )}

            {bp && <BlueprintSummary bp={bp} />}

            <Card title="3. Create it">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
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
              <div className="flex items-center gap-3">
                <Button tone="primary" onClick={() => void create()} disabled={busy !== null || !result.blueprint}>
                  {busy === 'create' ? 'Creating…' : 'Create the Factory'}
                </Button>
                <span className="text-xs text-[#161616]/45">Lands in draft and test mode. It cannot contact anybody until it passes the checklist.</span>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
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
    <Card title="The blueprint" right={<span className="font-mono text-[9px] text-[#161616]/40">{bp.modules.length} modules</span>}>
      <div className="space-y-4">
        <div>
          <h3 className="font-sans font-bold text-[#161616]">{bp.business.name}</h3>
          {bp.business.description && <p className="text-sm text-[#161616]/70 mt-1">{bp.business.description}</p>}
          <p className="text-sm text-[#161616]/85 mt-2"><strong>Offer:</strong> {bp.offer.headline}</p>
          <p className="text-xs text-[#161616]/50 mt-1">
            Pricing: the agent {bp.offer.ai_may_quote_price ? 'may quote approved package prices' : 'may not quote price and routes to a human'}.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-1">Ideal customer</h4>
            {bp.icp.map((i) => (
              <p key={i.label} className="text-sm text-[#161616]/75">
                <strong>{i.label}.</strong> {[...i.industries, ...i.geographies, ...i.business_signals].join(', ') || 'No criteria yet.'}
              </p>
            ))}
          </div>
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-1">Buying pain</h4>
            <p className="text-sm text-[#161616]/75">{bp.pain.primary}</p>
          </div>
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-1">AI salesperson</h4>
            <p className="text-sm text-[#161616]/75">{bp.agent.name}, {bp.agent.role}. {bp.agent.tools.length} tools.</p>
          </div>
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-1">Value action</h4>
            <p className="text-sm text-[#161616]/75">
              {bp.value_actions.length ? bp.value_actions.map((v) => v.label).join('; ') : 'None. It will ask for a meeting without doing anything first.'}
            </p>
          </div>
        </div>

        <div>
          <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#161616]/50 mb-1">Approved claims</h4>
          <ul className="space-y-0.5">
            {bp.business.approved_claims.length
              ? bp.business.approved_claims.map((c) => <li key={c} className="text-xs text-[#161616]/70">“{c}”</li>)
              : <li className="text-xs text-[#E0301E]">None. The agent would have nothing it is allowed to say.</li>}
          </ul>
        </div>

        {campaign && (
          <div className="border-2 border-[#161616]/15 rounded-lg p-3 bg-[#FBF6EA]">
            <h4 className="font-sans font-bold text-sm text-[#161616]">{campaign.name}</h4>
            <p className="text-xs text-[#161616]/60 mt-0.5"><strong>Hook:</strong> {campaign.hook}</p>
            <div className="mt-3 space-y-3">
              {campaign.sequence.map((s) => (
                <div key={s.step}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#161616]/40">Step {s.step} · day {s.day_offset}</p>
                  <p className="text-sm font-semibold text-[#161616]">{s.subject}</p>
                  <p className="text-sm text-[#161616]/70 whitespace-pre-wrap">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-[#161616]/45">
          Customer value: {money(bp.economics.avg_first_sale_cents)} first sale, {money(bp.economics.lifetime_value_cents)} lifetime.
        </p>
      </div>
    </Card>
  );
}
