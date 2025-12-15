import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

const sizes = [16, 32, 48, 128];
const svgPath = join(iconsDir, 'icon.svg');
const svgBuffer = readFileSync(svgPath);

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon${size}.png`);

    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);

    console.log(`Generated: icon${size}.png`);
  }

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
