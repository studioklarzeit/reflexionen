/**
 * generate-icons.mjs — Generiert PNG-Icons aus icon.svg
 * Einmalig ausführen: node scripts/generate-icons.mjs
 * Benötigt: npm install sharp (dev dependency)
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../public/icons/icon.svg');
const outDir = resolve(__dirname, '../public/icons');
const svg = readFileSync(svgPath);

const sizes = [
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
];

for (const { name, size } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, name));
  console.log(`  ✓ ${name} (${size}x${size})`);
}

console.log('\nAlle Icons generiert!');
