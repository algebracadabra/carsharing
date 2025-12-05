import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const svgBuffer = readFileSync(join(publicDir, 'icon.svg'));

await sharp(svgBuffer).resize(192, 192).png().toFile(join(publicDir, 'icon-192.png'));
console.log('icon-192.png erstellt');

await sharp(svgBuffer).resize(512, 512).png().toFile(join(publicDir, 'icon-512.png'));
console.log('icon-512.png erstellt');

console.log('Fertig!');
