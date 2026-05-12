import "dotenv/config";
import { downloadFromS3 } from "../src/lib/s3";

async function main() {
  const keys = [
    "backgrounds/thumbnails/light-wood-floor-thumb.jpg",
    "backgrounds/thumbnails/dark-wood-floor-thumb.jpg",
    "backgrounds/thumbnails/white-tile-floor-thumb.jpg",
    "backgrounds/thumbnails/gray-carpet-thumb.jpg",
    "backgrounds/thumbnails/brick-wall-thumb.jpg",
    "backgrounds/thumbnails/white-wall-thumb.jpg",
  ];
  for (const k of keys) {
    try {
      const b = await downloadFromS3(k);
      console.log(k.split("/").pop(), "→", b.length, "bytes");
    } catch (e: any) {
      console.log(k.split("/").pop(), "→ ERROR:", e.message);
    }
  }
}
main();
