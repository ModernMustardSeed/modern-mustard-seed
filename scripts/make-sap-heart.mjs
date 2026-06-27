import sharp from 'sharp';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
// Hand-drawn heart that crosses at the bottom and trails into a long tail.
const PATH = 'M 122 118 C 92 86, 58 78, 64 46 C 70 22, 108 26, 122 58 C 136 26, 174 22, 180 46 C 186 78, 152 86, 118 122 C 150 152, 208 134, 230 104';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 150"><path d="${PATH}" fill="none" stroke="#E0301E" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const png = await sharp(Buffer.from(svg), { density: 300 }).resize({ width: 480 }).png().toBuffer();
if (!existsSync('public/brand')) mkdirSync('public/brand', { recursive: true });
writeFileSync('public/brand/sap-heart.png', png);
console.log(`sap-heart.png written (${Math.round(png.length / 1024)} KB)`);
