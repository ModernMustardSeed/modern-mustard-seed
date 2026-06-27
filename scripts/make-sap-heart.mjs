import sharp from 'sharp';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
// Clean hand-drawn heart outline (no tail), white fill with a fine ink outline
// so it reads as a white heart on both cream/light and dark backgrounds.
export const HEART_PATH = 'M100 165 C 55 130, 18 96, 18 58 C 18 32, 41 16, 65 22 C 83 27, 95 43, 100 59 C 105 43, 117 27, 135 22 C 159 16, 182 32, 182 58 C 182 96, 145 130, 100 165 Z';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 185"><path d="${HEART_PATH}" fill="#FFFFFF" stroke="#161616" stroke-width="6" stroke-linejoin="round"/></svg>`;
const png = await sharp(Buffer.from(svg), { density: 300 }).resize({ width: 420 }).png().toBuffer();
if (!existsSync('public/brand')) mkdirSync('public/brand', { recursive: true });
writeFileSync('public/brand/sap-heart.png', png);
console.log(`sap-heart.png written (${Math.round(png.length / 1024)} KB), white heart outline, no tail`);
