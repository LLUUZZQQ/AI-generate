import "dotenv/config";

async function main() {
  const token = process.env.HF_TOKEN;

  // Test using official JS library
  const { HfInference } = await import("@huggingface/inference");
  const hf = new HfInference(token);

  // Try image segmentation (background removal)
  console.log("Testing image segmentation...");
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  const blob = new Blob([tinyPng]);

  try {
    const result = await hf.imageSegmentation({
      model: "briaai/RMBG-2.0",
      inputs: blob,
    });
    console.log("Segmentation result:", JSON.stringify(result).slice(0, 200));
  } catch (e: any) {
    console.log("Error:", e.message);
  }

  // Try text-to-image
  console.log("\nTesting text-to-image...");
  try {
    const result = await hf.textToImage({
      model: "stabilityai/stable-diffusion-xl-base-1.0",
      inputs: "plain white wall, natural lighting",
    });
    console.log("Image result type:", result.constructor.name);
    console.log("SUCCESS with HF library!");
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

main();
