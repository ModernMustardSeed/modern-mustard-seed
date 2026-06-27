import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { clientEmail, leadNotification, p, callout } from '@/lib/email';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

type Assets = { logoUrl?: string; photoUrls?: string[]; priceListUrl?: string };

type IntakePayload = {
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

  assets?: Assets;
};

function clean(v?: string): string {
  return (v ?? '').toString().trim();
}
function list(v?: string[]): string {
  return Array.isArray(v) ? v.filter(Boolean).join(', ') : '';
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as IntakePayload;

    const businessName = clean(data.businessName);
    const ownerName = clean(data.ownerName);
    const email = clean(data.email).toLowerCase();

    if (!businessName || !ownerName || !email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Business name, your name, and a valid email are required.' },
        { status: 400 }
      );
    }

    const firstName = ownerName.split(/\s+/)[0];
    const assets: Assets = data.assets ?? {};
    const photoUrls = Array.isArray(assets.photoUrls) ? assets.photoUrls.filter(Boolean) : [];

    // ── 1. Persist (best-effort). Merge under `brand_intake` so we never clobber
    //       a portal/proposal intake stored in the same row. ──
    const supabase = getSupabase();
    if (supabase) {
      try {
        const brandIntake = { ...data, email, submittedAt: new Date().toISOString() };
        const { data: existing } = await supabase
          .from('client_intake')
          .select('answers')
          .eq('client_email', email)
          .maybeSingle();
        const mergedAnswers = { ...(existing?.answers ?? {}), brand_intake: brandIntake };
        await supabase.from('client_intake').upsert(
          {
            client_email: email,
            answers: mergedAnswers,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'client_email' }
        );
        // Make sure they exist as a client so they show up in the admin board.
        await supabase.from('clients').upsert(
          { email, name: ownerName, company: businessName, tier: 'engagement' },
          { onConflict: 'email' }
        );
      } catch (dbErr) {
        console.error('Intake persist error (continuing to email):', dbErr);
      }
    }

    // ── 2. Email the team (primary, guaranteed delivery of every answer) ──
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);

      const fields: { label: string; value: string; isLink?: boolean }[] = [
        { label: 'Owner', value: ownerName },
        { label: 'Email', value: email },
      ];
      if (clean(data.phone)) fields.push({ label: 'Phone', value: clean(data.phone) });
      if (clean(data.location)) fields.push({ label: 'Location', value: clean(data.location) });
      if (clean(data.brandColors)) fields.push({ label: 'Brand colors', value: clean(data.brandColors) });
      if (list(data.vibeWords)) fields.push({ label: 'Vibe', value: list(data.vibeWords) });
      if (list(data.productTypes)) fields.push({ label: 'Makes', value: list(data.productTypes) });
      if (clean(data.sizeRange)) fields.push({ label: 'Sizes', value: clean(data.sizeRange) });
      if (clean(data.fulfillment)) fields.push({ label: 'Fulfillment', value: clean(data.fulfillment) });
      if (clean(data.catalogSize)) fields.push({ label: 'Catalog size', value: clean(data.catalogSize) });
      if (list(data.sellsWhere)) fields.push({ label: 'Sells on', value: list(data.sellsWhere) });
      if (clean(data.hasShopify)) fields.push({ label: 'Has Shopify', value: clean(data.hasShopify) });
      if (clean(data.shopifyUrl)) fields.push({ label: 'Shopify URL', value: clean(data.shopifyUrl), isLink: true });
      if (clean(data.domainStatus)) fields.push({ label: 'Domain', value: clean(data.domainStatus) });
      if (clean(data.desiredDomain)) fields.push({ label: 'Wants domain', value: clean(data.desiredDomain) });
      if (clean(data.launchTimeline)) fields.push({ label: 'Timeline', value: clean(data.launchTimeline) });
      const socials = [
        ['Instagram', data.instagram],
        ['Facebook', data.facebook],
        ['TikTok', data.tiktok],
        ['Etsy', data.etsy],
        ['Website', data.website],
      ].filter(([, v]) => clean(v as string));
      for (const [label, v] of socials) fields.push({ label: label as string, value: clean(v as string), isLink: true });
      if (assets.logoUrl) fields.push({ label: 'Logo file', value: assets.logoUrl, isLink: true });
      if (assets.priceListUrl) fields.push({ label: 'Price list', value: assets.priceListUrl, isLink: true });
      photoUrls.forEach((u, i) => fields.push({ label: `Photo ${i + 1}`, value: u, isLink: true }));

      const longAnswers = [
        ['The heart behind the brand', data.story],
        ['Brand voice', data.voice],
        ['Inspiration', data.inspiration],
        ['Materials', data.materials],
        ['Personalization', data.personalization],
        ['Bestsellers', data.bestsellers],
        ['Pricing notes', data.priceNotes],
        ['Shipping', data.shipping],
        ['Returns', data.returns],
        ['Goals for the store', data.goals],
        ['Dream customer', data.dreamCustomer],
        ['Anything else', data.notes],
      ]
        .filter(([, v]) => clean(v as string))
        .map(([label, v]) => `<strong>${label}:</strong> ${clean(v as string).replace(/\n/g, '<br>')}`)
        .join('<br><br>');

      try {
        await resend.emails.send({
          from: 'Brand Intake <sarah@modernmustardseed.com>',
          to: ['sarah@modernmustardseed.com', 'thompsonpolly71@gmail.com'],
          replyTo: email,
          subject: `New brand intake: ${businessName}`,
          html: leadNotification({
            type: 'Contact',
            name: ownerName,
            email,
            fields,
            message: longAnswers || 'No long-form answers provided.',
            suggestedAction: 'Review the full intake at modernmustardseed.com/admin/intakes',
          }),
        });
      } catch (mailErr) {
        console.error('Intake team email failed:', mailErr);
      }

      try {
        await resend.emails.send({
          from: 'Polly at Modern Mustard Seed <polly@modernmustardseed.com>',
          to: email,
          replyTo: 'thompsonpolly71@gmail.com',
          subject: `Got it, ${firstName}. Your brand is in good hands`,
          html: clientEmail({
            preheader: 'Thank you. Here is exactly what happens next with your store and website.',
            greeting: `${firstName},`,
            body:
              p(`Thank you for sharing the heart of <strong>${businessName}</strong> with me. I have everything I need to get started, and I am genuinely excited to build this for you.`) +
              p('Here is what happens next:') +
              `<ol style="margin:0 0 18px;padding-left:22px;color:#e9e1cf;line-height:1.75;font-size:16px">
                <li style="margin-bottom:10px"><strong style="color:#fff">I design three directions</strong> for the look and feel of your store, drawn from everything you just told me.</li>
                <li style="margin-bottom:10px"><strong style="color:#fff">You pick your favorite.</strong> I will send you a visual moodboard before a single page is built, so the design is yours from the start.</li>
                <li><strong style="color:#fff">I build the real, shoppable store</strong> and website, with your products, your pricing, and the marketing and search visibility baked in.</li>
              </ol>` +
              callout({
                label: 'A quiet reminder',
                title: 'This one is on the house',
                body: 'There is no cost to you for this build. I love what you make and I want it to have a home online that does it justice.',
              }) +
              p('If you forgot to mention something, or you find a few more product photos, just reply to this email and send them over. The more I have, the better the result.'),
            cta: { label: 'See your project space', url: 'https://modernmustardseed.com/portal/login' },
          }),
        });
      } catch (mailErr) {
        console.error('Intake client email failed:', mailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Intake submission error:', err);
    return NextResponse.json({ error: 'Submission failed. Please try again.' }, { status: 500 });
  }
}
