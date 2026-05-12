import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { uploadToS3 } from "../src/lib/s3";
import sharp from "sharp";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Generate varied textured backgrounds using sharp
async function generateBg(type: string): Promise<Buffer> {
  const w = 1024, h = 1024;
  const svgs: Record<string, string> = {
    // Wood floor — multiple horizontal stripes with varying wood tones and grain
    lightWood:
      `<svg width="${w}" height="${h}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#d4b896"/><stop offset="20%" stop-color="#c9ab85"/>
        <stop offset="40%" stop-color="#d0b48e"/><stop offset="60%" stop-color="#c4a47a"/>
        <stop offset="80%" stop-color="#d4b896"/><stop offset="100%" stop-color="#bf9e74"/>
      </linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>
      ${Array.from({length: 30}, (_, i) => `<line x1="0" y1="${i*34+Math.random()*10}" x2="${w}" y2="${i*34+Math.random()*10}" stroke="rgba(0,0,0,0.04)" stroke-width="${1+Math.random()*4}"/>`).join("")}
      </svg>`,
    darkWood:
      `<svg width="${w}" height="${h}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#5c3a21"/><stop offset="25%" stop-color="#4a2e18"/>
        <stop offset="50%" stop-color="#55351c"/><stop offset="75%" stop-color="#4a2e18"/>
        <stop offset="100%" stop-color="#5c3a21"/>
      </linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>
      ${Array.from({length: 25}, (_, i) => `<line x1="0" y1="${i*40+Math.random()*15}" x2="${w}" y2="${i*40+Math.random()*15}" stroke="rgba(0,0,0,0.06)" stroke-width="${1+Math.random()*3}"/>`).join("")}
      </svg>`,
    whiteTile:
      `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#f2f1ee"/>
      ${Array.from({length: 5}, (_, row) => Array.from({length: 5}, (_, col) =>
        `<rect x="${col*205}" y="${row*205}" width="200" height="200" fill="#f8f7f5" stroke="#e0ded9" stroke-width="1.5" rx="1"/>`
      ).join("")).join("")}
      </svg>`,
    grayCarpet:
      `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#c8c4be"/>
      <rect width="${w}" height="${h}" fill="url(#grain)" opacity="0.5"/>
      <defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="n"/><feColorMatrix type="saturate" values="0"/></filter><rect id="grain" width="${w}" height="${h}" filter="url(#noise)" opacity="0.04"/></defs>
      </svg>`,
    whiteWall:
      `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#fafaf8"/>
      <rect x="0" y="0" width="${w}" height="${h}" fill="url(#n)" opacity="0.3"/>
      <defs><radialGradient id="n" cx="40%" cy="30%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#eee"/></radialGradient></defs>
      </svg>`,
    brickWall:
      `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#c4956a"/>
      ${Array.from({length: 12}, (_, row) => Array.from({length: 8}, (_, col) => {
        const x = col*130 + (row%2===0 ? 0 : 65);
        const y = row*60;
        return `<rect x="${x+2}" y="${y+2}" width="124" height="56" fill="#b58055" stroke="#a07045" stroke-width="1.5" rx="2"/>`;
      }).join("")).join("")}
      </svg>`,
    woodDesk:
      `<svg width="${w}" height="${h}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#d4b896"/><stop offset="40%" stop-color="#c9a880"/>
        <stop offset="100%" stop-color="#b89670"/>
      </linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>
      ${Array.from({length: 20}, (_, i) => `<line x1="0" y1="${i*51}" x2="${w}" y2="${i*51}" stroke="rgba(139,90,43,0.08)" stroke-width="${0.5+Math.random()*2}"/>`).join("")}
      </svg>`,
    marbleDesk:
      `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#e8e4e0"/>
      ${Array.from({length: 8}, () => `<path d="M${Math.random()*w} 0 Q${Math.random()*w} ${h/2} ${Math.random()*w} ${h}" stroke="rgba(180,170,160,0.2)" stroke-width="${1+Math.random()*4}" fill="none"/>`).join("")}
      </svg>`,
    whiteBedsheet:
      `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#f8f8f6"/>
      ${Array.from({length: 15}, (_, i) => `<path d="M0 ${i*68} Q${w/3} ${i*68+15} ${w/2} ${i*68} Q${w*2/3} ${i*68-10} ${w} ${i*68}" stroke="rgba(0,0,0,0.03)" stroke-width="2" fill="none"/>`).join("")}
      </svg>`,
    balcony:
      `<svg width="${w}" height="${h}"><defs><linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="60%">
        <stop offset="0%" stop-color="#b8d8f0"/><stop offset="100%" stop-color="#d8e8f5"/>
      </linearGradient></defs><rect width="${w}" height="${h*0.6}" fill="url(#sky)"/>
      <rect y="${h*0.6}" width="${w}" height="${h*0.4}" fill="#d0c8be"/>
      ${Array.from({length: 8}, (_, i) => `<line x1="${i*146}" y1="${h*0.6}" x2="${i*146}" y2="${h}" stroke="rgba(0,0,0,0.05)" stroke-width="1"/>`).join("")}
      </svg>`,
    grassOutdoor:
      `<svg width="${w}" height="${h}"><defs><linearGradient id="gs" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#8ab868"/><stop offset="100%" stop-color="#6a9048"/>
      </linearGradient></defs><rect width="${w}" height="${h}" fill="url(#gs)"/>
      </svg>`,
    concreteFloor:
      `<svg width="${w}" height="${h}"><defs><radialGradient id="cf" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#bfbfba"/><stop offset="100%" stop-color="#a8a8a3"/>
      </radialGradient></defs><rect width="${w}" height="${h}" fill="url(#cf)"/>
      </svg>`,
  };
  const svg = svgs[type] || svgs.lightWood;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

const mapping: Record<string, string> = {
  "浅色木地板": "lightWood",
  "深色木地板": "darkWood",
  "白色瓷砖": "whiteTile",
  "灰色毛毯": "grayCarpet",
  "白墙-明亮": "whiteWall",
  "砖墙-复古": "brickWall",
  "木质桌面": "woodDesk",
  "大理石桌面": "marbleDesk",
  "白色床单": "whiteBedsheet",
  "阳台-自然光": "balcony",
  "草地-户外": "grassOutdoor",
  "水泥地面": "concreteFloor",
};

async function main() {
  const templates = await prisma.backgroundTemplate.findMany();
  for (const t of templates) {
    const type = mapping[t.name];
    if (!type) continue;

    try {
    console.log(`[${t.name}]`);
    const image = await generateBg(type);

    // Use English filename
    const engNames: Record<string, string> = {
      "浅色木地板": "light-wood-floor", "深色木地板": "dark-wood-floor",
      "白色瓷砖": "white-tile-floor", "灰色毛毯": "gray-carpet",
      "白墙-明亮": "white-wall", "砖墙-复古": "brick-wall",
      "木质桌面": "wood-desk", "大理石桌面": "marble-desk",
      "白色床单": "white-bedsheet", "阳台-自然光": "balcony",
      "草地-户外": "grass-outdoor", "水泥地面": "concrete-floor",
    };
    const eng = engNames[t.name];

    const key = `backgrounds/${t.category}/${eng}.jpg`;
    const url = await uploadToS3(key, image, "image/jpeg");
    console.log(`  S3: ${url}`);

    const thumb = await sharp(image).resize(300, 300, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
    const thumbKey = `backgrounds/thumbnails/${eng}-thumb.jpg`;
    await uploadToS3(thumbKey, thumb, "image/jpeg");

    await prisma.backgroundTemplate.update({
      where: { id: t.id },
      data: { fileUrl: url, thumbnailUrl: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${thumbKey}` },
    });

    const fs = await import("fs/promises");
    const lp = path.join(process.cwd(), "public", key);
    await fs.mkdir(path.dirname(lp), { recursive: true });
    await fs.writeFile(lp, image);
    const tp = path.join(process.cwd(), "public", thumbKey);
    await fs.mkdir(path.dirname(tp), { recursive: true });
    await fs.writeFile(tp, thumb);
    console.log(`  Done`);
    } catch(e: any) { console.log(`  ERROR: ${e.message}`); }
  }
  console.log("\nDone!");
  await prisma.$disconnect();
}
main().catch(console.error);
