const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT = path.join(__dirname, '..', 'public', 'icon.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

// PWA icon sizes (Apple, Android, Windows, favicon)
const SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'icon-48x48.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

// Maskable icons need 10% safe-zone padding per spec
const MASKABLE = [
  { size: 192, name: 'icon-maskable-192x192.png' },
  { size: 512, name: 'icon-maskable-512x512.png' },
];

const BG = { r: 15, g: 23, b: 42, alpha: 1 }; // #0f172a

async function generate() {
  if (!fs.existsSync(INPUT)) {
    console.error('❌ Source icon not found:', INPUT);
    process.exit(1);
  }

  console.log('🎨 Generating PWA icons from icon.svg...\n');

  // Standard icons
  for (const { size, name } of SIZES) {
    const output = path.join(OUTPUT_DIR, name);
    await sharp(INPUT)
      .resize(size, size, { fit: 'contain', background: BG })
      .png()
      .toFile(output);
    console.log(`  ✅ ${name} (${size}x${size})`);
  }

  // Maskable icons (icon shrunk to 80%, 10% padding each side)
  for (const { size, name } of MASKABLE) {
    const innerSize = Math.round(size * 0.8);
    const output = path.join(OUTPUT_DIR, name);
    const inner = await sharp(INPUT)
      .resize(innerSize, innerSize, { fit: 'contain', background: BG })
      .png()
      .toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: BG }
    })
      .composite([{ input: inner, gravity: 'centre' }])
      .png()
      .toFile(output);
    console.log(`  ✅ ${name} (${size}x${size}) [maskable]`);
  }

  // TWA splash — centered icon on dark background
  const SPLASH = [
    { w: 1080, h: 1920, name: 'splash-portrait.png' },
    { w: 1920, h: 1080, name: 'splash-landscape.png' },
  ];
  for (const { w, h, name } of SPLASH) {
    const iconSize = Math.round(Math.min(w, h) * 0.35);
    const output = path.join(OUTPUT_DIR, name);
    const icon = await sharp(INPUT)
      .resize(iconSize, iconSize, { fit: 'contain', background: BG })
      .png()
      .toBuffer();
    await sharp({
      create: { width: w, height: h, channels: 4, background: BG }
    })
      .composite([{ input: icon, gravity: 'centre' }])
      .png()
      .toFile(output);
    console.log(`  ✅ ${name} (${w}x${h}) [splash]`);
  }

  const total = SIZES.length + MASKABLE.length + SPLASH.length;
  console.log(`\n🎉 Generated ${total} icons in client/public/`);
}

generate().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
