import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Brand Intakes', noindex: true });
export const dynamic = 'force-dynamic';

type BrandIntake = {
  businessName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  location?: string;
  story?: string;
  brandColors?: string;
  vibeWords?: string[];
  voice?: string;
  inspiration?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  etsy?: string;
  website?: string;
  productTypes?: string[];
  sizeRange?: string;
  fulfillment?: string;
  catalogSize?: string;
  materials?: string;
  personalization?: string;
  bestsellers?: string;
  priceNotes?: string;
  sellsWhere?: string[];
  hasShopify?: string;
  shopifyUrl?: string;
  shipping?: string;
  returns?: string;
  goals?: string;
  dreamCustomer?: string;
  domainStatus?: string;
  desiredDomain?: string;
  launchTimeline?: string;
  notes?: string;
  submittedAt?: string;
  assets?: { logoUrl?: string; photoUrls?: string[]; priceListUrl?: string };
};

function Row({ label, value, link }: { label: string; value?: string; link?: boolean }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-[#161616]/8">
      <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/45 pt-0.5">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-[#1E50C8] underline break-words">
          {value}
        </a>
      ) : (
        <span className="text-sm text-[#161616] font-body whitespace-pre-wrap break-words">{value}</span>
      )}
    </div>
  );
}

export default async function AdminIntakesPage() {
  const supabase = getSupabase();
  let intakes: { email: string; created_at: string; bi: BrandIntake }[] = [];

  if (supabase) {
    const { data } = await supabase
      .from('client_intake')
      .select('client_email, created_at, answers')
      .order('created_at', { ascending: false })
      .limit(200);
    intakes = (data ?? [])
      .filter((r) => r.answers && (r.answers as Record<string, unknown>).brand_intake)
      .map((r) => ({
        email: r.client_email as string,
        created_at: r.created_at as string,
        bi: (r.answers as Record<string, BrandIntake>).brand_intake,
      }));
  }

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616] py-10 px-5 md:px-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/admin" className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold text-[#E0301E]">
              &larr; Admin
            </a>
            <h1 className="font-display text-4xl font-black tracking-tight mt-2">Brand Intakes</h1>
          </div>
          <span className="pop-card-yellow px-4 py-2 text-sm font-display font-black">{intakes.length}</span>
        </div>

        {intakes.length === 0 && (
          <div className="pop-card p-10 text-center text-[#161616]/55 font-body">
            No intakes yet. The form lives at <span className="font-mono">/intake</span>.
          </div>
        )}

        <div className="space-y-8">
          {intakes.map((it, idx) => {
            const b = it.bi;
            const a = b.assets ?? {};
            return (
              <article key={`${it.email}-${idx}`} className="pop-card p-7 md:p-9">
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
                  <h2 className="font-display text-3xl font-black tracking-tight">{b.businessName || it.email}</h2>
                  <span className="text-xs font-mono text-[#161616]/45">
                    {new Date(b.submittedAt || it.created_at).toLocaleString()}
                  </span>
                </div>

                {a.logoUrl && (
                  <div className="mb-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.logoUrl} alt="logo" className="h-20 object-contain bg-white rounded-lg border-2 border-[#161616] p-2" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <Row label="Owner" value={b.ownerName} />
                    <Row label="Email" value={b.email || it.email} />
                    <Row label="Phone" value={b.phone} />
                    <Row label="Location" value={b.location} />
                    <Row label="Colors" value={b.brandColors} />
                    <Row label="Vibe" value={b.vibeWords?.join(', ')} />
                    <Row label="Makes" value={b.productTypes?.join(', ')} />
                    <Row label="Sizes" value={b.sizeRange} />
                    <Row label="Fulfillment" value={b.fulfillment} />
                    <Row label="Catalog" value={b.catalogSize} />
                    <Row label="Materials" value={b.materials} />
                    <Row label="Personalization" value={b.personalization} />
                  </div>
                  <div>
                    <Row label="Sells on" value={b.sellsWhere?.join(', ')} />
                    <Row label="Has Shopify" value={b.hasShopify} />
                    <Row label="Shopify" value={b.shopifyUrl} link />
                    <Row label="Domain" value={b.domainStatus} />
                    <Row label="Wants domain" value={b.desiredDomain} />
                    <Row label="Timeline" value={b.launchTimeline} />
                    <Row label="Instagram" value={b.instagram} />
                    <Row label="Facebook" value={b.facebook} />
                    <Row label="Etsy" value={b.etsy} link />
                    <Row label="Website" value={b.website} link />
                    <Row label="Price list" value={a.priceListUrl} link />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <Row label="Story" value={b.story} />
                  <Row label="Voice" value={b.voice} />
                  <Row label="Inspiration" value={b.inspiration} />
                  <Row label="Bestsellers" value={b.bestsellers} />
                  <Row label="Pricing" value={b.priceNotes} />
                  <Row label="Shipping" value={b.shipping} />
                  <Row label="Returns" value={b.returns} />
                  <Row label="Goals" value={b.goals} />
                  <Row label="Dream customer" value={b.dreamCustomer} />
                  <Row label="Notes" value={b.notes} />
                </div>

                {a.photoUrls && a.photoUrls.length > 0 && (
                  <div className="mt-6">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/45 block mb-3">
                      Product photos ({a.photoUrls.length})
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {a.photoUrls.map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden border-2 border-[#161616]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u} alt={`product ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
