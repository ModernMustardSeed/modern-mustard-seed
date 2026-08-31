/**
 * The postcard itself, front and back, as print-ready HTML at 300 DPI.
 *
 * WHY A POSTCARD AND NOT AN EMAIL. Email here is finished: 5.2% hard bounce,
 * the recorded "clicks" were mail security gateways, and the From address on
 * ~37 sends does not exist. Mail has no spam filter, no sender reputation and
 * no consent gate. It is the only channel left that reaches all 4,400
 * addressable leads at a rate we can actually predict.
 *
 * WHAT THE CARD IS FOR. Not closing. A $497 + $497/mo decision does not happen
 * off paper. The card has exactly one job: make a contractor curious enough to
 * type seven characters, because that visit is an inbound hand raise, and an
 * inbound hand raise is the consent record the calling machine has been
 * starving for (six records across 9,730 leads on 2026-08-30).
 *
 * PRINT GEOMETRY. Every number below is in inches at the top and converted
 * once. The USPS address block and its barcode clear zone on the back are not
 * decoration: artwork that paints into them is rejected by the printer, after
 * the postage is spent.
 *
 * ⚠️ CONFIRM THE TEMPLATE BEFORE THE FIRST PAID DROP. Providers change bleed
 * specs. Render one card, submit it against a TEST key, and let the provider's
 * own validator confirm the dimensions. scripts/mailer/render.mjs --check does
 * exactly this and costs nothing.
 */

import type { PreviewSpec } from '@/lib/mailer/preview';
import { shortName } from '@/lib/mailer/site-html';

const esc = (s: string): string =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** 6x9 landscape, the largest card that still mails at postcard rates. */
export const CARD = {
  dpi: 300,
  trimW: 9,
  trimH: 6,
  bleed: 0.125,
  /** Nothing that must survive the guillotine goes outside this. */
  safe: 0.1875,
  /** USPS block on the back, measured from the bottom-right corner. */
  addrW: 4.5,
  addrH: 2.75,
} as const;

export const CARD_PX = {
  w: Math.round((CARD.trimW + CARD.bleed * 2) * CARD.dpi), // 2775
  h: Math.round((CARD.trimH + CARD.bleed * 2) * CARD.dpi), // 1875
};

const IN = (inches: number): number => Math.round(inches * CARD.dpi);

/** Height of the browser frame on the front, chrome included. */
const SHOT_BOX_H = 3.7;
const SHOT_CHROME_H = 0.2;

/**
 * The exact aspect ratio the website screenshot must be shot at.
 *
 * If the capture is any other shape, `object-fit: cover` crops it, and it
 * always crops through the middle of the hero buttons: the one place on the
 * card where a cut reads as a mistake instead of a design. The renderer asks
 * for this ratio rather than assuming one, so changing SHOT_BOX_H above moves
 * the camera with it.
 */
export const PREVIEW_SHOT = {
  w: CARD_PX.w - IN(CARD.bleed + CARD.safe) * 2,
  h: IN(SHOT_BOX_H) - IN(SHOT_CHROME_H),
  /** Capture width, chosen so a 1180px-max-width layout still centres nicely. */
  captureWidth: 1800,
  get captureHeight(): number {
    return Math.round((this.captureWidth * this.h) / this.w);
  },
};

export type Recipient = {
  business: string;
  contact?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
};

export type CardOptions = {
  /** data: URI or absolute URL of the rendered website preview. */
  previewImage: string;
  /** data: URI of the QR code PNG. */
  qrImage: string;
  /** The printed short code, e.g. K7HFM2Q. */
  code: string;
  /** Shown under the code: "modernmustardseed.com/y/K7HFM2Q". */
  displayUrl: string;
  studioPhone: string;
  returnAddress: string[];
};

const SHELL = (bodyCss: string, body: string): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    width:${CARD_PX.w}px;height:${CARD_PX.h}px;overflow:hidden;position:relative;
    font-family:"Segoe UI Variable Text","Segoe UI",Inter,system-ui,-apple-system,Arial,sans-serif;
    -webkit-font-smoothing:antialiased;
    ${bodyCss}
  }
  .display{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;font-weight:700;letter-spacing:-.02em}
  /* Trim and safe guides. Hidden in production output; --guides turns them on
     so a proof print can be checked against a ruler. */
  .guide{position:absolute;border:2px dashed rgba(255,0,0,.55);display:none}
  body.guides .guide{display:block}
</style></head><body>${body}
<div class="guide" style="left:${IN(CARD.bleed)}px;top:${IN(CARD.bleed)}px;width:${IN(CARD.trimW)}px;height:${IN(CARD.trimH)}px"></div>
<div class="guide" style="left:${IN(CARD.bleed + CARD.safe)}px;top:${IN(CARD.bleed + CARD.safe)}px;width:${IN(CARD.trimW - CARD.safe * 2)}px;height:${IN(CARD.trimH - CARD.safe * 2)}px;border-color:rgba(0,120,255,.5)"></div>
</body></html>`;

/**
 * FRONT. Their own website, printed large, and one sentence naming them.
 * No offer, no price, no logo of ours worth reading at arm's length. The front
 * exists to make them turn the card over.
 */
/**
 * Headline size in inches for "<name> has a new website." Two lines is the
 * design; three lines runs off the card. Measured against the widest name in
 * the table, "Rocky Mountain Overhead Door Company" at 36 characters.
 */
function frontHeadlineIn(name: string): number {
  const chars = name.length + 20; // + " has a new website."
  if (chars <= 38) return 0.42;
  if (chars <= 46) return 0.37;
  if (chars <= 54) return 0.33;
  return 0.29;
}

export function postcardFrontHtml(spec: PreviewSpec, o: CardOptions): string {
  const p = spec.palette;
  const name = shortName(spec.business);
  const pad = IN(CARD.bleed + CARD.safe);
  const shotTop = IN(CARD.bleed + 0.34);
  const shotH = IN(SHOT_BOX_H);

  return SHELL(
    `background:${p.paper};color:${p.ink};`,
    `
  <!-- accent rail, bleeds off three edges -->
  <div style="position:absolute;left:0;top:0;width:100%;height:${IN(0.34 + CARD.bleed)}px;background:${p.accent}"></div>

  <div style="position:absolute;left:${pad}px;top:${IN(0.1)}px;height:${IN(0.34)}px;display:flex;align-items:center;gap:${IN(0.07)}px;
              color:${p.onAccent};font-size:${IN(0.088)}px;font-weight:800;letter-spacing:.26em;text-transform:uppercase">
    <span>${esc(spec.tradeLabel)}${spec.place ? ' &middot; ' + esc(spec.place) : ''}</span>
  </div>

  <!-- the website, in a browser frame -->
  <div style="position:absolute;left:${pad}px;top:${shotTop}px;width:${CARD_PX.w - pad * 2}px;height:${shotH}px;
              border-radius:${IN(0.06)}px;overflow:hidden;background:#fff;
              box-shadow:0 ${IN(0.03)}px ${IN(0.14)}px rgba(0,0,0,.22), 0 0 0 ${IN(0.007)}px rgba(0,0,0,.14)">
    <div style="height:${IN(SHOT_CHROME_H)}px;background:#E9EAEC;display:flex;align-items:center;padding:0 ${IN(0.11)}px;gap:${IN(0.045)}px">
      <span style="width:${IN(0.05)}px;height:${IN(0.05)}px;border-radius:50%;background:#C7C9CE"></span>
      <span style="width:${IN(0.05)}px;height:${IN(0.05)}px;border-radius:50%;background:#C7C9CE"></span>
      <span style="width:${IN(0.05)}px;height:${IN(0.05)}px;border-radius:50%;background:#C7C9CE"></span>
      <span style="margin-left:${IN(0.13)}px;flex:1;height:${IN(0.125)}px;background:#fff;border-radius:${IN(0.06)}px;
                   font-size:${IN(0.075)}px;color:#6B7076;display:flex;align-items:center;padding:0 ${IN(0.09)}px;letter-spacing:.01em">
        ${esc(o.displayUrl)}
      </span>
    </div>
    <img src="${esc(o.previewImage)}" style="display:block;width:100%;height:${shotH - IN(SHOT_CHROME_H)}px;object-fit:cover;object-position:top center">
  </div>

  <!-- The sentence. The legal name is shortened and the type shrinks with it,
       because "On Time Plumbing, Heating, Cooling & Electric has a new website"
       at full size runs three lines and pushes the subline past the trim. -->
  <div style="position:absolute;left:${pad}px;right:${pad}px;top:${shotTop + shotH + IN(0.24)}px;bottom:${IN(CARD.bleed + CARD.safe)}px;
              display:flex;flex-direction:column;justify-content:center">
    <div class="display" style="font-size:${IN(frontHeadlineIn(name))}px;line-height:1.04;margin-bottom:${IN(0.1)}px">
      ${esc(name)} has a new website.
    </div>
    <div style="font-size:${IN(0.128)}px;line-height:1.4;color:${p.muted};max-width:${IN(6.6)}px">
      We built it already. It is finished, it is live, and it is waiting for you at the address on the back of this card.
    </div>
  </div>`
  );
}

/**
 * BACK. The offer, the code, the QR, and the USPS block.
 *
 * The right third of this card belongs to the Postal Service. Everything we
 * have to say lives in the left two thirds, and the address panel underneath
 * stays white.
 */
export function postcardBackHtml(spec: PreviewSpec, r: Recipient, o: CardOptions): string {
  const p = spec.palette;
  const pad = IN(CARD.bleed + CARD.safe);
  const colW = CARD_PX.w - IN(CARD.addrW) - pad - IN(0.3);
  const addrLeft = CARD_PX.w - IN(CARD.bleed + CARD.addrW);
  const addrTop = CARD_PX.h - IN(CARD.bleed + CARD.addrH);

  return SHELL(
    `background:#FFFFFF;color:${p.ink};`,
    `
  <div style="position:absolute;left:0;top:0;width:${IN(0.16)}px;height:100%;background:${p.accent}"></div>

  <!-- return address, top left, small -->
  <div style="position:absolute;left:${pad}px;top:${IN(CARD.bleed + 0.16)}px;font-size:${IN(0.082)}px;line-height:1.42;color:#6A6F77">
    ${o.returnAddress.map((l) => esc(l)).join('<br>')}
  </div>

  <!-- The pitch, centred in the space the return address and the price bar
       leave it, so a long business name cannot push the code off the card. -->
  <div style="position:absolute;left:${pad}px;top:${IN(0.95)}px;bottom:${IN(0.95)}px;width:${colW}px;
              display:flex;flex-direction:column;justify-content:center">
    <div style="font-size:${IN(0.088)}px;font-weight:800;letter-spacing:.26em;text-transform:uppercase;color:${p.accent};margin-bottom:${IN(0.14)}px">
      Go and look at it
    </div>
    <div class="display" style="font-size:${IN(0.3)}px;line-height:1.12;margin-bottom:${IN(0.16)}px">
      Type this in, or scan it.<br>It is your website.
    </div>
    <div style="font-size:${IN(0.115)}px;line-height:1.5;color:#4A5057;margin-bottom:${IN(0.2)}px;max-width:${IN(3.9)}px">
      Built for ${esc(spec.business)}, not a template with your name dropped in.
      Nothing to fill in, nothing to install. If you want to keep it we put it on
      your own domain and it answers your phone too. If you do not, keep the card.
    </div>

    <!-- the code, big enough to read at arm's length -->
    <div style="display:flex;align-items:center;gap:${IN(0.24)}px">
      <img src="${esc(o.qrImage)}" style="width:${IN(1.16)}px;height:${IN(1.16)}px;display:block;border-radius:${IN(0.03)}px">
      <div>
        <div style="font-size:${IN(0.082)}px;letter-spacing:.2em;text-transform:uppercase;color:#7A8089;font-weight:700;margin-bottom:${IN(0.05)}px">
          Or type
        </div>
        <div style="font-size:${IN(0.108)}px;color:#4A5057;margin-bottom:${IN(0.04)}px">${esc(o.displayUrl.replace(/\/[A-Z0-9]+$/, '/'))}</div>
        <div class="display" style="font-size:${IN(0.34)}px;letter-spacing:.06em;line-height:1;color:${p.ink}">${esc(o.code)}</div>
      </div>
    </div>
  </div>

  <!-- price, bottom left, stated plainly -->
  <div style="position:absolute;left:${pad}px;bottom:${IN(CARD.bleed + 0.2)}px;width:${colW}px;
              border-top:${IN(0.012)}px solid #E3E5E8;padding-top:${IN(0.13)}px;
              display:flex;align-items:baseline;gap:${IN(0.16)}px;font-size:${IN(0.1)}px;color:#585E66">
    <span><b style="color:${p.ink};font-size:${IN(0.12)}px">$497</b> to make it yours</span>
    <span><b style="color:${p.ink};font-size:${IN(0.12)}px">$497</b>/month, cancel anytime</span>
    <span style="margin-left:auto;font-weight:700;color:${p.ink}">${esc(o.studioPhone)}</span>
  </div>

  <!-- USPS: address block bottom right. Stays white, nothing paints into it. -->
  <div style="position:absolute;left:${addrLeft}px;top:${addrTop}px;width:${IN(CARD.addrW)}px;height:${IN(CARD.addrH)}px;background:#fff"></div>
  <div style="position:absolute;left:${addrLeft + IN(0.3)}px;top:${addrTop + IN(0.42)}px;
              font-size:${IN(0.125)}px;line-height:1.5;color:#111;font-family:Arial,Helvetica,sans-serif">
    ${r.contact ? `${esc(r.contact)}<br>` : ''}${esc(r.business)}<br>
    ${esc(r.line1)}<br>
    ${r.line2 ? `${esc(r.line2)}<br>` : ''}
    ${esc(r.city)}, ${esc(r.state)} ${esc(r.zip)}
  </div>`
  );
}
