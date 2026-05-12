import sharp from "sharp";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "backgrounds");
const THUMB_DIR = path.join(OUTPUT_DIR, "thumbnails");

// Each template: [name, category, color1, color2]
const templates: [string, string, string, string][] = [
  ["浅色木地板", "indoor-floor", "#e8d5b7", "#d4b896"],
  ["深色木地板", "indoor-floor", "#5c3a21", "#3e2210"],
  ["白色瓷砖",   "indoor-floor", "#f0f0ee", "#e0e0dd"],
  ["灰色毛毯",   "indoor-floor", "#c4bfba", "#b0aba6"],
  ["白墙-明亮",  "indoor-wall",  "#fafaf8", "#f0f0ee"],
  ["砖墙-复古",  "indoor-wall",  "#b5653e", "#8b4513"],
  ["木质桌面",   "indoor-desk",  "#c49a6c", "#a0724a"],
  ["大理石桌面", "indoor-desk",  "#e8e4e0", "#d4d0cc"],
  ["白色床单",   "indoor-bed",   "#fcfcfc", "#f4f4f2"],
  ["阳台-自然光", "outdoor",     "#d4e8f0", "#b8d4e0"],
  ["草地-户外",   "outdoor",     "#7ba05b", "#5a8040"],
  ["水泥地面",   "indoor-floor", "#b0b0ad", "#9a9a98"],
];

async function main() {
  for (const [name, category, color1, color2] of templates) {
    const filename = name.toLowerCase().replace(/\s+/g, "-");
    const filePath = path.join(OUTPUT_DIR, category, `${filename}.jpg`);
    const thumbPath = path.join(THUMB_DIR, `${filename}-thumb.jpg`);

    // Generate a simple two-tone gradient background
    const svg = `<svg width="1024" height="1024">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1}"/>
          <stop offset="100%" style="stop-color:${color2}"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#g)"/>
      <text x="512" y="540" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#00000033">${name}</text>
    </svg>`;

    // Full size
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 90 })
      .toFile(filePath);

    // Thumbnail
    await sharp(Buffer.from(svg))
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    console.log(`Generated: ${category}/${filename}.jpg + thumbnail`);
  }

  console.log(`\nDone! Generated ${templates.length * 2} images.`);
}

main().catch(console.error);
