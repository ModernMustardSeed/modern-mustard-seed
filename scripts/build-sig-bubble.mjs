// Rebuilds the portrait bubble in Sarah's email signature from a source photo.
//
// The geometry below is measured off the shipped asset, not invented: on the
// 216px (2x) canvas the photo disc is r=82, the cream band runs 82->92, the ink
// ring runs 92->100, and 8px of transparent bleed keeps the ring from clipping.
// No drop shadow, and no colour in the ring: she rejected both.
//
//   node scripts/build-sig-bubble.mjs <src.jpg> <out.png> <cx> <cy> <cr> [pad]
//
// cx/cy/cr are in source pixels. `pad` grows the source square with a blurred,
// feathered copy of itself first, so a tight selfie can still sit set back in
// the circle the way the original crop did.
import sharp from 'sharp'

const SIZE = 216
const R_PHOTO = 82
const R_CREAM = 92
const R_INK = 100
const INK = '#161616'
const CREAM = '#FBF6EA'

const src = process.argv[2]
const out = process.argv[3]
const CX = Number(process.argv[4])
const CY = Number(process.argv[5])
const CR = Number(process.argv[6])
const PAD = Number(process.argv[7] || 0)

const c = SIZE / 2
const D = R_PHOTO * 2

async function padded() {
  if (!PAD) return sharp(src)
  const meta = await sharp(src).metadata()
  const W = meta.width + PAD * 2
  const H = meta.height + PAD * 2
  const feather = 70

  // Backdrop: the photo itself, blown up past the frame and blurred, so the new
  // border carries the room's own colour instead of a flat plate.
  const backdrop = await sharp(src)
    .resize(W, H, { fit: 'cover' })
    .blur(28)
    .modulate({ saturation: 0.9, brightness: 1.02 })
    .toBuffer()

  // The real photo, its edges faded out over `feather` px so there is no seam
  // where it meets the backdrop.
  const mask = Buffer.from(
    `<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
       <defs><filter id="f"><feGaussianBlur stdDeviation="${feather / 3}"/></filter></defs>
       <rect x="${feather}" y="${feather}" width="${meta.width - feather * 2}" height="${meta.height - feather * 2}" fill="#fff" filter="url(#f)"/>
     </svg>`,
  )
  const faded = await sharp(src)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  const flat = await sharp(backdrop)
    .composite([{ input: faded, left: PAD, top: PAD }])
    .png()
    .toBuffer()
  return sharp(flat)
}

const base = await padded()

const disc = await base
  .extract({
    left: Math.round(CX - CR),
    top: Math.round(CY - CR),
    width: Math.round(CR * 2),
    height: Math.round(CR * 2),
  })
  .resize(D, D, { fit: 'cover', kernel: 'lanczos3' })
  // The source is a phone selfie: soft and a little flat. A light grade and a
  // gentle sharpen are what keep it reading at the 114px it actually ships at.
  .modulate({ saturation: 1.05 })
  .linear(1.04, -3)
  .sharpen({ sigma: 0.7 })
  .composite([{
    input: Buffer.from(
      `<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="#fff"/></svg>`,
    ),
    blend: 'dest-in',
  }])
  .png()
  .toBuffer()

const rings = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
     <circle cx="${c}" cy="${c}" r="${(R_INK + R_CREAM) / 2}" fill="none" stroke="${INK}" stroke-width="${R_INK - R_CREAM}"/>
     <circle cx="${c}" cy="${c}" r="${(R_CREAM + R_PHOTO) / 2 + 0.5}" fill="none" stroke="${CREAM}" stroke-width="${R_CREAM - R_PHOTO + 1}"/>
   </svg>`,
)

await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: disc, left: c - R_PHOTO, top: c - R_PHOTO },
    { input: rings, left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(out)

console.log('wrote', out)
