import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcIcon = join(__dirname, '..', 'store-assets', 'icon.png');
const iconDir = join(__dirname, '..', 'public', 'icon');

if (!existsSync(iconDir)) mkdirSync(iconDir, { recursive: true });

const metadata = await sharp(srcIcon).metadata();
const w = metadata.width;
const h = metadata.height;

const cropPct = 0.12;
const left = Math.round(w * cropPct);
const top = Math.round(h * cropPct);
const cropW = w - left * 2;
const cropH = h - top * 2;

for (const size of [16, 32, 48, 128]) {
  await sharp(srcIcon)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(iconDir, `icon-${size}.png`));
  console.log(`icon-${size}.png generated (${size}x${size})`);
}

console.log('Done!');
