// Generates the Modern Mustard Seed brand board as a PNG and a PDF.
// Run from the project root:  node scripts/generate-brand-board.mjs
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const INK = '#161616';
const MIDNIGHT = '#080C16';
const CREAM = '#FBF6EA';
const WHITE = '#FFFFFF';
const YELLOW = '#F5B700';
const RED = '#E0301E';
const BLUE = '#1E50C8';
const MUTED = '#6f6a60';

const W = 2000;
const H = 2800;

const lockup = readFileSync('public/brand/logo-lockup.png').toString('base64');
const mascot = readFileSync('public/brand/mascot.png').toString('base64');

// Fonts: Playfair Display (display), DM Sans (body), JetBrains Mono (labels),
// Cormorant Garamond (accent). The renderer falls back to serif/sans, so the
// board labels the true families by name.
const DISP = "'Playfair Display', Georgia, 'Times New Roman', serif";
const BODY = "'DM Sans', Arial, sans-serif";
const MONO = "'JetBrains Mono', Consolas, monospace";
const ACC = "'Cormorant Garamond', Georgia, serif";

const swatches = [
  { name: 'Pop Yellow', hex: '#F5B700', fill: YELLOW, text: INK },
  { name: 'Pop Red', hex: '#E0301E', fill: RED, text: WHITE },
  { name: 'Pop Blue', hex: '#1E50C8', fill: BLUE, text: WHITE },
  { name: 'Cream', hex: '#FBF6EA', fill: CREAM, text: INK },
  { name: 'Ink', hex: '#161616', fill: INK, text: CREAM },
  { name: 'Midnight', hex: '#080C16', fill: MIDNIGHT, text: CREAM },
];

const M = 120; // margin
const eyebrow = (x, y, text, fill = RED) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="26" font-weight="700" letter-spacing="8" fill="${fill}">${text}</text>`;
const sectionLabel = (x, y, text) =>
  `${eyebrow(x, y, text, RED)}<line x1="${x}" y1="${y + 22}" x2="${x + 120}" y2="${y + 22}" stroke="${INK}" stroke-width="4"/>`;

// ── Color swatches row ──
const swW = (W - 2 * M - 5 * 30) / 6;
const swY = 1300;
const colorBlocks = swatches
  .map((s, i) => {
    const x = M + i * (swW + 30);
    return `
      <rect x="${x}" y="${swY}" width="${swW}" height="${swW}" rx="22" fill="${s.fill}" stroke="${INK}" stroke-width="4"/>
      <text x="${x + 22}" y="${swY + swW - 26}" font-family="${MONO}" font-size="22" font-weight="700" fill="${s.text}">${s.hex}</text>
      <text x="${x}" y="${swY + swW + 44}" font-family="${BODY}" font-size="30" font-weight="700" fill="${INK}">${s.name}</text>`;
  })
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="halftone" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="6" r="3.4" fill="rgba(245,183,0,0.45)"/>
    </pattern>
    <radialGradient id="sun" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="rgba(245,183,0,0.42)"/>
      <stop offset="45%" stop-color="rgba(245,183,0,0.12)"/>
      <stop offset="70%" stop-color="rgba(245,183,0,0)"/>
    </radialGradient>
  </defs>

  <!-- Page -->
  <rect width="${W}" height="${H}" fill="${CREAM}"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="${INK}" stroke-width="10" rx="8"/>

  <!-- Masthead -->
  <rect x="20" y="20" width="${W - 40}" height="700" fill="url(#halftone)" opacity="0.5"/>
  <rect x="20" y="20" width="${W - 40}" height="700" fill="url(#sun)"/>
  ${eyebrow(M, 130, 'BRAND BOARD')}
  <text x="${W - M}" y="130" text-anchor="end" font-family="${MONO}" font-size="24" font-weight="700" letter-spacing="6" fill="${MUTED}">MODERNMUSTARDSEED.COM</text>
  <image href="data:image/png;base64,${lockup}" x="${W / 2 - 200}" y="170" width="400" height="435"/>
  <text x="${W / 2}" y="678" text-anchor="middle" font-family="${ACC}" font-style="italic" font-size="46" fill="${INK}">You bring the seed, we build the tree.</text>
  <line x1="20" y1="720" x2="${W - 20}" y2="720" stroke="${INK}" stroke-width="10"/>

  <!-- Marks -->
  ${sectionLabel(M, 820, 'LOGO + MARK')}
  <rect x="${M}" y="860" width="${(W - 2 * M - 40) / 2}" height="320" rx="24" fill="${WHITE}" stroke="${INK}" stroke-width="4"/>
  <image href="data:image/png;base64,${lockup}" x="${M + (W - 2 * M - 40) / 4 - 120}" y="888" width="240" height="261"/>
  <text x="${M + 28}" y="1150" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="3" fill="${MUTED}">PRIMARY LOCKUP</text>

  <rect x="${M + (W - 2 * M - 40) / 2 + 40}" y="860" width="${(W - 2 * M - 40) / 2}" height="320" rx="24" fill="${YELLOW}" stroke="${INK}" stroke-width="4"/>
  <image href="data:image/png;base64,${mascot}" x="${M + (W - 2 * M - 40) / 2 + 40 + (W - 2 * M - 40) / 4 - 95}" y="884" width="190" height="253"/>
  <text x="${M + (W - 2 * M - 40) / 2 + 68}" y="1150" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="3" fill="${INK}">THE SEED MASCOT</text>

  <!-- Palette -->
  ${sectionLabel(M, 1250, 'PALETTE')}
  ${colorBlocks}

  <!-- Typography -->
  ${sectionLabel(M, 1690, 'TYPOGRAPHY')}
  <text x="${M}" y="1760" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="3" fill="${MUTED}">DISPLAY / PLAYFAIR DISPLAY</text>
  <text x="${M}" y="1842" font-family="${DISP}" font-size="84" font-weight="900" fill="${INK}">We build the <tspan fill="${YELLOW}" stroke="${INK}" stroke-width="3" paint-order="stroke">tree</tspan>.</text>

  <text x="${M}" y="1930" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="3" fill="${MUTED}">BODY / DM SANS</text>
  <text x="${M}" y="1988" font-family="${BODY}" font-size="40" font-weight="700" fill="${INK}">Aa Bb Cc</text>
  <text x="${M}" y="2038" font-family="${BODY}" font-size="30" fill="${INK}">Apps, sites, and specialty AI tools for your business.</text>

  <text x="${M + 1000}" y="1760" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="3" fill="${MUTED}">MONO / JETBRAINS MONO</text>
  <text x="${M + 1000}" y="1818" font-family="${MONO}" font-size="30" font-weight="700" letter-spacing="6" fill="${RED}">NOW BOOKING NEW BUILDS</text>
  <text x="${M + 1000}" y="1930" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="3" fill="${MUTED}">ACCENT / CORMORANT GARAMOND</text>
  <text x="${M + 1000}" y="2006" font-family="${ACC}" font-style="italic" font-size="44" fill="${INK}">faith as small as a mustard seed</text>

  <!-- Elements -->
  ${sectionLabel(M, 2080, 'ELEMENTS')}
  <!-- sticker shadow -->
  <rect x="${M + 14}" y="2134" width="300" height="150" rx="18" fill="${INK}"/>
  <rect x="${M}" y="2120" width="300" height="150" rx="18" fill="${YELLOW}" stroke="${INK}" stroke-width="4"/>
  <text x="${M + 150}" y="2210" text-anchor="middle" font-family="${BODY}" font-size="26" font-weight="800" fill="${INK}">Sticker shadow</text>
  <!-- halftone -->
  <rect x="${M + 360}" y="2120" width="300" height="150" rx="18" fill="url(#halftone)" stroke="${INK}" stroke-width="4"/>
  <text x="${M + 510}" y="2210" text-anchor="middle" font-family="${BODY}" font-size="26" font-weight="800" fill="${INK}">Halftone</text>
  <!-- outlined word -->
  <rect x="${M + 720}" y="2120" width="300" height="150" rx="18" fill="${CREAM}" stroke="${INK}" stroke-width="4"/>
  <text x="${M + 870}" y="2224" text-anchor="middle" font-family="${DISP}" font-size="72" font-weight="900" fill="${CREAM}" stroke="${INK}" stroke-width="3" paint-order="stroke">POP</text>
  <!-- comic chip -->
  <rect x="${M + 1080}" y="2120" width="300" height="150" rx="75" fill="${RED}" stroke="${INK}" stroke-width="4"/>
  <text x="${M + 1230}" y="2210" text-anchor="middle" font-family="${MONO}" font-size="24" font-weight="800" letter-spacing="3" fill="${WHITE}">COMIC CHIP</text>
  <!-- blue swatch tile -->
  <rect x="${M + 1440}" y="2120" width="${W - M - (M + 1440) - 0}" height="150" rx="18" fill="${BLUE}" stroke="${INK}" stroke-width="4"/>
  <text x="${M + 1440 + (W - M - (M + 1440)) / 2}" y="2210" text-anchor="middle" font-family="${BODY}" font-size="26" font-weight="800" fill="${WHITE}">Pop Blue</text>

  <!-- Voice -->
  ${sectionLabel(M, 2400, 'VOICE')}
  <text x="${M}" y="2466" font-family="${BODY}" font-size="34" font-weight="700" fill="${INK}">Faith-rooted · Bold · Warm · Founder-led · Pop-art · Shipped</text>
  <text x="${M}" y="2520" font-family="${BODY}" font-size="28" fill="${MUTED}">Direct and human. No hedging, no jargon. We say what we will build, then we ship it.</text>

  <!-- Footer -->
  <rect x="20" y="2600" width="${W - 40}" height="180" fill="${MIDNIGHT}"/>
  <line x1="20" y1="2600" x2="${W - 20}" y2="2600" stroke="${YELLOW}" stroke-width="6"/>
  <text x="${W / 2}" y="2682" text-anchor="middle" font-family="${ACC}" font-style="italic" font-size="40" fill="${CREAM}">&#8220;If you have faith as small as a mustard seed, nothing will be impossible for you.&#8221;</text>
  <text x="${W / 2}" y="2734" text-anchor="middle" font-family="${MONO}" font-size="24" font-weight="700" letter-spacing="6" fill="${YELLOW}">MATTHEW 17:20 · MODERN MUSTARD SEED</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toFile(path.join(os.homedir(), 'Downloads', 'Modern-Mustard-Seed-Brand-Board.png'))
  .then(() => readFileSync(path.join(os.homedir(), 'Downloads', 'Modern-Mustard-Seed-Brand-Board.png')));

// PDF: one page sized to the board ratio, the PNG embedded full-bleed.
const doc = await PDFDocument.create();
const pageW = 720;
const pageH = Math.round((pageW * H) / W);
const page = doc.addPage([pageW, pageH]);
const img = await doc.embedPng(png);
page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
const pdfBytes = await doc.save();
writeFileSync(path.join(os.homedir(), 'Downloads', 'Modern-Mustard-Seed-Brand-Board.pdf'), pdfBytes);

console.log('Wrote PNG (' + png.length + ' bytes) and PDF to Downloads');
