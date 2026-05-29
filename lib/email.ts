/**
 * Transactional email templates (HTML strings) for the store.
 *
 * Inline styles only. Email clients strip <style> blocks and external CSS,
 * so every rule lives on the element.
 *
 * LIGHT theme on purpose. Dark-themed email is fragile: Gmail and Apple Mail
 * dark mode partially invert colors and can render dark text on a dark card,
 * which is what made the old version unreadable. A light card with explicit
 * dark text reads correctly in every client and in both light and dark mode.
 *
 * The look matches the website: a deep-blue sky header with drifting clouds,
 * then a clean cream card below. Brass/gold accents and the mustard-seed mark.
 */

const BRAND = {
  sky: '#1F4280',       // deep brand sky
  skyMid: '#3E6BA8',    // mid sky for the gradient
  skyLight: '#8FC0EF',  // pale sky highlight
  ink: '#16203A',       // near-black navy for body copy (high contrast on cream)
  inkSoft: '#46506A',   // softer slate for secondary copy
  cream: '#FBF8F2',     // card background
  creamEdge: '#EFE7D6', // hairline / borders
  gold: '#C8964E',      // brass
  goldLight: '#E8C88A', // gold highlight
};

type Download = { name: string; url: string };

/**
 * A reusable sky band with drifting clouds for the email header. Uses cloud
 * emoji (universally supported) layered over a blue gradient with a solid
 * fallback color so it reads even where gradients are stripped.
 */
function skyHeader(subtitle: string): string {
  return `
    <tr>
      <td style="background-color: ${BRAND.sky}; background-image: linear-gradient(160deg, ${BRAND.sky} 0%, ${BRAND.skyMid} 60%, ${BRAND.skyLight} 100%); padding: 36px 40px 30px; text-align: center;">
        <div style="font-size: 22px; line-height: 1; letter-spacing: 6px; margin-bottom: 10px;">&#9729;&#65039; &#9729;&#65039; &#9729;&#65039;</div>
        <div style="font-size: 40px; line-height: 1; margin-bottom: 10px;">&#127793;</div>
        <div style="color: #FFFFFF; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; font-weight: 700;">Modern Mustard Seed</div>
        <div style="color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 6px;">${subtitle}</div>
      </td>
    </tr>`;
}

export function storeOrderConfirmationEmail(opts: {
  firstName: string;
  itemName: string;
  downloads: Download[];
  priceUsd: number;
}): string {
  const { firstName, itemName, downloads, priceUsd } = opts;
  const downloadButtons = downloads
    .map(
      (d) => `
      <tr>
        <td style="padding: 7px 0;">
          <a href="${d.url}" style="display: block; box-sizing: border-box; padding: 16px 24px; background-color: ${BRAND.gold}; background-image: linear-gradient(135deg, ${BRAND.gold}, ${BRAND.goldLight}); color: ${BRAND.ink}; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 12px; text-align: center;">
            &#11015;&#65039;&nbsp; Download ${d.name}
          </a>
        </td>
      </tr>`
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
  </head>
  <body style="margin: 0; padding: 0; background-color: #DCEAF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #DCEAF7; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${BRAND.cream}; border-radius: 18px; overflow: hidden; border: 1px solid ${BRAND.creamEdge};">
            ${skyHeader('Your dream, built to fullness')}
            <!-- Body -->
            <tr>
              <td style="padding: 34px 40px 8px; background-color: ${BRAND.cream};">
                <h1 style="color: ${BRAND.ink}; font-size: 25px; margin: 0 0 14px; font-weight: 700;">It is ready, ${firstName}. &#9729;&#65039;</h1>
                <p style="color: ${BRAND.inkSoft}; font-size: 16px; line-height: 1.65; margin: 0 0 22px;">
                  Thank you for your purchase. Your <strong style="color: ${BRAND.ink};">${itemName}</strong> ${downloads.length > 1 ? 'files are' : 'file is'} ready to download below. Yours for good.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${downloadButtons}
                </table>
                <p style="color: ${BRAND.inkSoft}; font-size: 14px; line-height: 1.6; margin: 22px 0 0;">
                  These download links expire in 24 hours. Need a fresh one? Just reply to this email and I will send it right over.
                </p>
              </td>
            </tr>
            <!-- Credit note -->
            <tr>
              <td style="padding: 24px 40px 0; background-color: ${BRAND.cream};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1px solid ${BRAND.creamEdge}; border-radius: 12px;">
                  <tr>
                    <td style="padding: 16px 20px;">
                      <p style="color: ${BRAND.ink}; font-size: 14px; line-height: 1.6; margin: 0;">
                        &#127793; Your <strong>${'$'}${priceUsd}</strong> credits toward any Modern Mustard Seed engagement. Just mention it when you reach out.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding: 26px 40px 36px; background-color: ${BRAND.cream};">
                <p style="color: ${BRAND.inkSoft}; font-size: 13px; line-height: 1.6; margin: 0; border-top: 1px solid ${BRAND.creamEdge}; padding-top: 20px;">
                  Modern Mustard Seed. Built with faith and code.<br>
                  <a href="https://modernmustardseed.com" style="color: ${BRAND.gold}; text-decoration: none; font-weight: 600;">modernmustardseed.com</a>
                </p>
              </td>
            </tr>
          </table>
          <!-- Cloud sign-off under the card, for fun -->
          <div style="font-size: 18px; letter-spacing: 8px; margin-top: 18px;">&#9729;&#65039; &#9729;&#65039; &#9729;&#65039;</div>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

export function storeOrderNotificationEmail(opts: {
  name: string;
  email: string;
  itemName: string;
  priceUsd: number;
  sessionId: string;
}): string {
  const { name, email, itemName, priceUsd, sessionId } = opts;
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
  </head>
  <body style="margin: 0; padding: 0; background-color: #DCEAF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #DCEAF7; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: ${BRAND.cream}; border-radius: 18px; overflow: hidden; border: 1px solid ${BRAND.creamEdge};">
            ${skyHeader('New store sale')}
            <tr>
              <td style="padding: 32px 40px 36px; background-color: ${BRAND.cream};">
                <h1 style="color: ${BRAND.ink}; font-size: 21px; margin: 0 0 16px; font-weight: 700;">New store sale &#127881; &#9729;&#65039;</h1>
                <p style="color: ${BRAND.inkSoft}; font-size: 15px; line-height: 1.7; margin: 0 0 14px;">
                  <strong style="color: ${BRAND.ink};">${name}</strong> just bought <strong style="color: ${BRAND.ink};">${itemName}</strong> for <strong style="color: ${BRAND.ink};">${'$'}${priceUsd}</strong>.
                </p>
                <p style="color: ${BRAND.inkSoft}; font-size: 15px; line-height: 1.7; margin: 0;">
                  Email: <a href="mailto:${email}" style="color: ${BRAND.gold}; text-decoration: none; font-weight: 600;">${email}</a><br>
                  Session: <span style="color: ${BRAND.ink};">${sessionId}</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}
