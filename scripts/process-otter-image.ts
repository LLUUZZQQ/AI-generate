import sharp from "sharp";
import { copyFile, mkdir } from "fs/promises";
import path from "path";

async function main() {
  const outDir = path.join(process.cwd(), "public", "otters");
  await mkdir(outDir, { recursive: true });

  const src = path.join(process.cwd(), "微信图片_20260514015156.jpg");

  // 1. Get metadata
  const meta = await sharp(src).metadata();
  console.log("Original:", meta.width + "x" + meta.height, meta.format);

  // 2. Resize for 3D texture (max 1024px)
  const texture = await sharp(src)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  await sharp(texture).toFile(path.join(outDir, "otters.png"));
  console.log("Texture: 1024px PNG -> public/otters/otters.png");

  // 3. Generate alpha mask (simple luminance-based — for background removal)
  // This creates a rough mask; user can replace with precise manual mask
  const mask = await sharp(src)
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .greyscale()
    .linear(1.5, -0.3) // boost contrast to separate subject from background
    .blur(1)
    .png()
    .toBuffer();
  await sharp(mask).toFile(path.join(outDir, "otters-mask.png"));
  console.log("Mask: -> public/otters/otters-mask.png");

  // 4. Generate simple normal map from luminance
  // Sobel-like edge detection for normals
  const { data, info } = await sharp(src)
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const normalPixels = Buffer.alloc(w * h * 3);
  const pixels = data as Buffer;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const left = x > 0 ? pixels[i - 1] : pixels[i];
      const right = x < w - 1 ? pixels[i + 1] : pixels[i];
      const up = y > 0 ? pixels[i - w] : pixels[i];
      const down = y < h - 1 ? pixels[i + w] : pixels[i];

      const nx = (left - right) / 255 * 4;
      const ny = (up - down) / 255 * 4;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      normalPixels[i * 3] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      normalPixels[i * 3 + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      normalPixels[i * 3 + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
    }
  }

  await sharp(normalPixels, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toFile(path.join(outDir, "otters-normal.png"));
  console.log("Normal map: 512px -> public/otters/otters-normal.png");

  console.log("\nDone! Files in public/otters/:");
  console.log("  otters.png        — Main texture (replace with masked version if needed)");
  console.log("  otters-mask.png   — Alpha mask");
  console.log("  otters-normal.png — Generated normal map (replace with hand-crafted version)");
  console.log("\nFor best results, replace these with manually processed versions.");
}

main().catch(console.error);
