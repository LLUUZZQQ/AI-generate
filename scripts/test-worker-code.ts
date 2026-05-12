import "dotenv/config";
import { HfInference } from "@huggingface/inference";
import { readFileSync, writeFileSync } from "fs";
import sharp from "sharp";

const hf = new HfInference(process.env.HF_TOKEN!);

async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });

  const result = await hf.imageSegmentation({ model: "briaai/RMBG-2.0", inputs: blob });

  console.log("Result type:", typeof result);
  console.log("Is array:", Array.isArray(result));
  console.log("Keys:", Object.keys(result as any));
  console.log("Result:", JSON.stringify(result).slice(0, 300));

  // Result is an array of { label, score, mask } — mask is base64 PNG
  if (Array.isArray(result)) {
    const mask = result[0]?.mask;
    if (!mask) throw new Error("No mask in segmentation result");

    const maskBuffer = Buffer.from(mask, "base64");
    const original = sharp(imageBuffer);
    const { width, height } = await original.metadata();
    if (!width || !height) throw new Error("Cannot read image dimensions");

    const maskImage = sharp(maskBuffer).resize(width, height).greyscale();

    return original
      .ensureAlpha()
      .composite([{ input: await maskImage.toBuffer(), blend: "dest-in" }])
      .png()
      .toBuffer();
  }

  if (result && typeof result === "object" && "arrayBuffer" in result) {
    return Buffer.from(await (result as Blob).arrayBuffer());
  }

  throw new Error(`Unexpected segmentation result type: ${typeof result}`);
}

async function main() {
  // Test with a small test image
  const input = readFileSync("public/uploads/cmp1xpjj700001ovdsgmwmsrn_1778549085405.jpg");
  // Convert to PNG first
  const pngInput = await sharp(input).resize(512, 512, { fit: "inside" }).png().toBuffer();
  console.log(`Input: ${pngInput.length} bytes`);

  try {
    const result = await removeBackground(pngInput);
    writeFileSync("public/test-bg-removed.png", result);
    console.log(`SUCCESS! Output: ${result.length} bytes → public/test-bg-removed.png`);
  } catch (e: any) {
    console.log("FAILED:", e.message);
  }
}

main();
