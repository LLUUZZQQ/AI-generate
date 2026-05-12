import { readFileSync, writeFileSync } from "fs";
import sharp from "sharp";

async function main() {
  console.log("Testing @imgly/background-removal-node...");
  const { removeBackground } = await import("@imgly/background-removal-node");

  // Convert JPG to PNG buffer first
  const jpgBuf = readFileSync("public/uploads/cmp1xpjj700001ovdsgmwmsrn_1778549085405.jpg");
  const pngBuf = await sharp(jpgBuf).png().toBuffer();
  console.log(`Input: ${pngBuf.length} bytes (converted to PNG)`);

  try {
    const blob = await removeBackground(pngBuf, {
      model: "medium",
      output: { format: "image/png", quality: 1 },
    });

    const buf = Buffer.from(await blob.arrayBuffer());
    console.log(`Output: ${buf.length} bytes`);

    writeFileSync("public/test-result.png", buf);
    console.log("Saved to public/test-result.png");
    console.log("SUCCESS!");
  } catch (e: any) {
    console.log("ERROR:", e.message);
  }
}

main();
