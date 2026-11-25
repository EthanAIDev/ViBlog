import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
export const AVATAR_RELATIVE_PATH = 'assets/avatars/about-avatar.jpg';

/**
 * Generates browser favicons (favicon.png, favicon.svg, apple-touch-icon.png)
 * directly from the About page avatar so replacing the avatar automatically
 * keeps every site icon in sync.
 */
export async function syncAvatarFavicons(projectRoot = root) {
  const avatarPath = path.join(projectRoot, AVATAR_RELATIVE_PATH);
  const publicDir = path.join(projectRoot, 'public');
  await mkdir(publicDir, { recursive: true });

  const sourceBytes = await readFile(avatarPath);

  // 1) Crisp 64x64 rounded-square PNG favicon with subtle hairline ring for light & dark tab bars
  const size = 64;
  const radius = 14;
  const roundedMask = Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#ffffff"/></svg>`,
  );
  const hairlineRing = Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="${size - 1.5}" height="${size - 1.5}" rx="${radius - 0.5}" ry="${radius - 0.5}" fill="none" stroke="rgba(15,23,38,0.16)" stroke-width="1.5"/></svg>`,
  );

  const square64 = await sharp(sourceBytes)
    .rotate()
    .resize(size, size, { fit: 'cover', position: 'attention' })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const faviconPng = await sharp(square64)
    .ensureAlpha()
    .composite([
      { input: roundedMask, blend: 'dest-in' },
      { input: hairlineRing, blend: 'over' },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(path.join(publicDir, 'favicon.png'), faviconPng);

  // 2) SVG wrapper embedding the 64x64 avatar with rounded clip so /favicon.svg stays synced too
  const dataUri = `data:image/png;base64,${square64.toString('base64')}`;
  const faviconSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    `  <defs><clipPath id="r"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></clipPath></defs>`,
    `  <image href="${dataUri}" width="${size}" height="${size}" clip-path="url(#r)" preserveAspectRatio="xMidYMid slice"/>`,
    `  <rect x="0.75" y="0.75" width="${size - 1.5}" height="${size - 1.5}" rx="${radius - 0.5}" ry="${radius - 0.5}" fill="none" stroke="rgba(15,23,38,0.16)" stroke-width="1.5"/>`,
    `</svg>`,
    '',
  ].join('\n');
  await writeFile(path.join(publicDir, 'favicon.svg'), faviconSvg, 'utf8');

  // 3) 180x180 Apple Touch Icon (iOS/macOS applies its own squircle mask)
  const appleTouchPng = await sharp(sourceBytes)
    .rotate()
    .resize(180, 180, { fit: 'cover', position: 'attention' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(publicDir, 'apple-touch-icon.png'), appleTouchPng);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await syncAvatarFavicons();
  console.log('Favicons synced from', AVATAR_RELATIVE_PATH);
}
