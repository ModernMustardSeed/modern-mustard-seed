/**
 * The email that hands a client everything.
 *
 * Sarah, 2026-08-28: "give me place where i can add his email and then i press
 * send, for the intial email with his demos and costs and gbp info and all the
 * things we cover and do."
 *
 * Built from what is already filed on the client's card rather than from a
 * template we keep in sync by hand. Every link in it is a `client_files` row,
 * so the email and the admin can never disagree about what he was sent: if a
 * link is wrong in the email it is wrong on the card, and fixing it once fixes
 * both.
 *
 * The one convention: a row whose label starts with "Pay:" renders as an orange
 * button that takes money. Everything else renders as a white button that does
 * not. A man should never have to wonder whether the thing he just tapped
 * charged him, and colour is the only part of an email that reliably survives
 * being read on a phone in a truck.
 */

export type DeliveryLink = { label: string; url: string; kind: string };

export type DeliveryInput = {
  /** Their first name, for the greeting. Empty is handled. */
  firstName: string;
  company: string;
  links: DeliveryLink[];
  /** Set when Sarah is sending it to herself to read before he does. */
  preview?: boolean;
};

const PAY = /^pay:\s*/i;
/**
 * A video is not a link.
 *
 * Sarah, 2026-08-28: "I also dont see video in email." It was in there, as one
 * more white button among four, indistinguishable from the website link. Two
 * minutes of the product actually working is the most persuasive thing we can
 * put in an inbox, and it does not survive being the fourth white rectangle in
 * a list.
 */
const VIDEO = /\b(video|walkthrough|film|watch)\b/i;
/** Links that are internal plumbing and have no business in a client's inbox. */
const PRIVATE = /^(go-live|golive|runbook|call sheet|notes|internal|admin|sent:)/i;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * One thing, said plainly, big enough to read on a phone.
 *
 * Sarah, 2026-08-28: "dont do the little dots where they have to open them to
 * see, make it more clear, like heres your demo website and heres the console."
 *
 * She is right. A row of near-identical rectangles with short labels makes a
 * man click each one to find out what it is, and a man who has to click to find
 * out mostly does not click. Every block now says what the thing is in a line
 * he can read without opening it, and carries a visible "open it" so the whole
 * block reads as a door rather than as a bullet point.
 */
function button(href: string, label: string, sub: string, pay: boolean) {
  const fill = pay ? "#C4380C" : "#ffffff";
  const ink = pay ? "#ffffff" : "#14181c";
  const quiet = pay ? "rgba(255,255,255,.85)" : "#5A626A";
  return `
  <a href="${esc(href)}" style="display:block;text-decoration:none;margin:0 0 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;">
      <tr><td style="background:${fill};border:2px solid #14181c;box-shadow:5px 5px 0 #14181c;padding:20px 22px;">
        <div style="font:700 21px/1.22 -apple-system,Segoe UI,sans-serif;color:${ink};">${esc(label)}</div>
        ${sub ? `<div style="font:400 15px/1.45 -apple-system,Segoe UI,sans-serif;color:${quiet};margin-top:7px;">${esc(sub)}</div>` : ""}
        <div style="font:700 11px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:${pay ? "#F5B700" : "#C4380C"};margin-top:12px;">${pay ? "Tap to pay" : "Tap to open"} &nbsp;&rarr;</div>
      </td></tr>
    </table>
  </a>`;
}

/**
 * What a link is for, in one line under its button.
 *
 * Keyed off the label rather than stored, because Sarah types these labels in
 * the admin and asking her to also write a subtitle is asking her to do the
 * same job twice.
 */
function subtitle(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("website") && !PAY.test(label))
    return "Every page of it, already built and already live. Open it on your phone and scroll.";
  if (l.includes("console") || l.includes("cornerstone"))
    return "Your jobs, your money, your paperwork, all on one screen. Open it and read the paragraph at the top. That is what lands on your phone every morning at five.";
  if (l.includes("google"))
    return "It already exists and it already has your reviews on it. Nobody has claimed it yet, which means anybody can suggest an edit to it.";
  // Never nothing. A block with no explanation is the thing she asked us to
  // stop doing, so anything unrecognised says at least where it goes.
  return "Open it and have a look.";
}

/**
 * The video, rendered like one: dark, wide, a play mark and a running time,
 * above everything else in the message.
 *
 * Email clients will not play a file inline, so this is an honest poster that
 * opens the video rather than a fake player that does nothing when tapped.
 */
function videoBlock(href: string, label: string) {
  return `
  <a href="${esc(href)}" style="display:block;text-decoration:none;margin:0 0 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;">
      <tr><td style="background:#14181c;border:2px solid #14181c;box-shadow:4px 4px 0 #C4380C;padding:22px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td width="62" valign="middle" style="padding-right:16px;">
              <div style="width:46px;height:46px;background:#F5B700;border-radius:999px;text-align:center;font:700 17px/46px -apple-system,Segoe UI,sans-serif;color:#14181c;">&#9654;</div>
            </td>
            <td valign="middle">
              <div style="font:700 11px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#F5B700;">Two minutes</div>
              <div style="font:700 19px/1.25 -apple-system,Segoe UI,sans-serif;color:#ffffff;margin-top:6px;">${esc(label)}</div>
              <div style="font:400 13px/1.45 -apple-system,Segoe UI,sans-serif;color:#A9B4BC;margin-top:5px;">Watch this before you open anything else. It shows the whole thing working.</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </a>`;
}

/** The step-by-step Google Business Profile block. Plain, numbered, no jargon. */
const GBP_STEPS = [
  ["Search your own name on Google", "Type your business name and your town. Your listing comes up, with your reviews already on it."],
  ["Look for “Own this business?”", "It is a small line under the listing. Tap it. If you do not see it, tap the three dots, then “Claim this business”."],
  ["Sign in with the Google account you actually use", "Whichever one is on your phone. Write down which one you used, because that account owns the listing from then on."],
  ["Choose the postcard", "Google mails a five digit code to your business address. It takes about five business days. There is no faster option for a contractor."],
  ["When the postcard arrives, type in the code", "That is it. You are verified, and you can edit everything."],
  ["Then do these four things", "Add your hours. Add your service area. Add ten photos off your jobs. Add your website link. That is the whole hour, and it is the highest value hour of your month."],
];

export function buildDeliveryEmail(input: DeliveryInput): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, company, links } = input;
  const usable = links.filter((l) => !PRIVATE.test(l.label));
  const pays = usable.filter((l) => PAY.test(l.label));
  const videos = usable.filter((l) => !PAY.test(l.label) && VIDEO.test(l.label));
  const looks = usable.filter((l) => !PAY.test(l.label) && !VIDEO.test(l.label));

  const greeting = firstName ? `${firstName}, here is everything` : "Here is everything";

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f5f3ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;padding:28px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:2px solid #14181c;">

<tr><td style="padding:28px 26px 6px;">
  <div style="font:700 11px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#6e7c87;">Modern Mustard Seed</div>
  <h1 style="font:800 27px/1.15 -apple-system,Segoe UI,sans-serif;color:#14181c;margin:12px 0 0;">${esc(greeting)}</h1>
</td></tr>

<tr><td style="padding:16px 26px 0;font:400 16px/1.6 -apple-system,Segoe UI,sans-serif;color:#2b3138;">
  <p style="margin:0 0 14px;">Everything below is already built and already sitting there. Have a look at it before you decide anything.</p>
  <p style="margin:0 0 14px;">Nothing charges you a penny until you tap one of the orange buttons.</p>
</td></tr>

${videos.length ? `<tr><td style="padding:20px 26px 0;">
  ${videos.map((l) => videoBlock(l.url, 'See Cornerstone working')).join("")}
</td></tr>` : ""}

${looks.length ? `<tr><td style="padding:22px 26px 0;">
  <div style="font:700 11px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6e7c87;margin-bottom:12px;">Have a look at these. Nothing here charges you.</div>
  ${looks.map((l) => button(l.url, l.label, subtitle(l.label), false)).join("")}
</td></tr>` : ""}

${pays.length ? `<tr><td style="padding:22px 26px 0;">
  <div style="font:700 11px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#6e7c87;margin-bottom:12px;">These two take money. Only these two.</div>
  ${pays.map((l) => button(l.url, l.label.replace(PAY, ""), "", true)).join("")}
  <p style="margin:2px 0 0;font:400 13px/1.5 -apple-system,Segoe UI,sans-serif;color:#6e7c87;">Anything with a monthly on it is month to month. Cancel any month, no notice, no penalty.</p>
</td></tr>` : ""}

<tr><td style="padding:24px 26px 0;font:400 15px/1.6 -apple-system,Segoe UI,sans-serif;color:#2b3138;">
  <h2 style="font:800 19px/1.25 -apple-system,Segoe UI,sans-serif;color:#14181c;margin:0 0 10px;">Do this today, whatever you decide about the rest</h2>
  <p style="margin:0 0 14px;">Claim your Google listing. It already exists, it already has your reviews on it, and right now anybody can suggest an edit to it including a competitor. Claiming it is free and it is worth more to you than any website.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    ${GBP_STEPS.map(
      ([t, b], i) => `<tr>
      <td width="30" valign="top" style="padding:0 0 14px;font:700 15px/1.5 -apple-system,Segoe UI,sans-serif;color:#C4380C;">${i + 1}</td>
      <td valign="top" style="padding:0 0 14px;">
        <div style="font:700 15px/1.4 -apple-system,Segoe UI,sans-serif;color:#14181c;">${t}</div>
        <div style="font:400 14px/1.55 -apple-system,Segoe UI,sans-serif;color:#3d464e;margin-top:2px;">${b}</div>
      </td></tr>`,
    ).join("")}
  </table>
  <p style="margin:6px 0 0;font:400 14px/1.55 -apple-system,Segoe UI,sans-serif;color:#6e7c87;">Get stuck on any of it, ring me and we will do it together on the phone.</p>
</td></tr>

<tr><td style="padding:26px 26px 0;font:400 15px/1.6 -apple-system,Segoe UI,sans-serif;color:#2b3138;">
  <h2 style="font:800 19px/1.25 -apple-system,Segoe UI,sans-serif;color:#14181c;margin:0 0 10px;">Getting found, which is the whole point</h2>
  <p style="margin:0 0 12px;">A website nobody finds is a business card in a drawer. Everything we build is set up for all three of the ways people look for a contractor now, and none of it costs extra:</p>
  <p style="margin:0 0 10px;"><strong>Google and Bing.</strong> Every service and every town you cover gets its own page, because that is what actually ranks. Your address, hours and service area are marked up so the search engines read them as facts rather than as text. Sitemap submitted, everything indexed.</p>
  <p style="margin:0 0 10px;"><strong>Your map listing.</strong> The website and the Google listing point at each other, which is most of local ranking. That is why claiming it matters more than anything on this email.</p>
  <p style="margin:0 0 12px;"><strong>AI search.</strong> When somebody asks ChatGPT or Google's AI answers who does concrete in Kalispell, those systems read structured pages, not adverts. Yours are written and marked up so they can be read, quoted and cited. Most contractors' sites cannot be.</p>
  <p style="margin:0 0 12px;">And we keep doing it. If a page is not ranking in a few months, that is our problem to fix, not a new invoice.</p>
</td></tr>

<tr><td style="padding:24px 26px 0;font:400 15px/1.6 -apple-system,Segoe UI,sans-serif;color:#2b3138;">
  <h2 style="font:800 19px/1.25 -apple-system,Segoe UI,sans-serif;color:#14181c;margin:0 0 10px;">What happens after you pay</h2>
  <p style="margin:0 0 12px;">You get one short form: your logo, your colours, photos off your jobs, and your contractor license number. Ten minutes on your phone. I build the real thing around your answers and email you when it is live on your own domain.</p>
  <p style="margin:0 0 12px;">Every photograph on the site right now is a stand-in. Yours replace them.</p>
</td></tr>

<tr><td style="padding:18px 26px 26px;">
  <div style="border-left:3px solid #F5B700;padding:2px 0 2px 14px;font:400 15px/1.6 -apple-system,Segoe UI,sans-serif;color:#2b3138;">
    Anything on here you want different, say so and I change it. Not three revisions, not a change order. That is just how we work, and it does not stop after launch.
  </div>
  <p style="margin:20px 0 0;font:400 15px/1.6 -apple-system,Segoe UI,sans-serif;color:#2b3138;">Sarah<br>
  <a href="mailto:sarah@modernmustardseed.com" style="color:#C4380C;">sarah@modernmustardseed.com</a></p>
</td></tr>

</table>
<div style="font:400 12px/1.5 -apple-system,Segoe UI,sans-serif;color:#6e7c87;max-width:560px;margin:14px auto 0;text-align:center;">
  Modern Mustard Seed &middot; built for ${esc(company)}
</div>
</td></tr></table></body></html>`;

  const text = [
    greeting,
    "",
    "Everything below is already built and sitting there. Nothing charges you until you tap a pay link.",
    "",
    ...(videos.length
      ? ["WATCH THIS FIRST, TWO MINUTES", ...videos.map((l) => `${l.label}\n  ${l.url}`), ""]
      : []),
    ...(looks.length
      ? ["LOOK AT THESE FIRST", ...looks.map((l) => `${l.label}\n  ${l.url}`), ""]
      : []),
    ...(pays.length
      ? [
          "WHEN YOU ARE READY",
          ...pays.map((l) => `${l.label.replace(PAY, "")}\n  ${l.url}`),
          "Anything monthly is month to month. Cancel any month.",
          "",
        ]
      : []),
    "DO THIS TODAY: CLAIM YOUR GOOGLE LISTING",
    ...GBP_STEPS.map(([t, b], i) => `${i + 1}. ${t}\n   ${b}`),
    "Get stuck, ring me and we do it on the phone.",
    "",
    "GETTING FOUND",
    "Every service and every town gets its own page, which is what ranks. Your",
    "details are marked up so Google and Bing read them as facts. The site and",
    "your map listing point at each other. And the pages are written so AI search",
    "can read, quote and cite them, which most contractors' sites cannot. If a",
    "page is not ranking in a few months, that is ours to fix, not a new invoice.",
    "",
    "AFTER YOU PAY",
    "One short form: logo, colours, job photos, license number. Ten minutes. I",
    "build the real thing around your answers and email you when it is live on",
    "your own domain. Every photo on the site now is a stand-in.",
    "",
    "Anything you want different, say so and I change it. No extra, no change order.",
    "",
    "Sarah",
    "sarah@modernmustardseed.com",
  ].join("\n");

  return {
    subject: input.preview
      ? `[preview] ${company}: everything, and what to do about Google`
      : `${company}: your website, your console, and your Google listing`,
    html,
    text,
  };
}
