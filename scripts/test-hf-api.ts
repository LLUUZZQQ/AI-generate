import "dotenv/config";

async function main() {
  const token = process.env.HF_TOKEN;
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  // Try a few models to see which work
  const models = [
    "briaai/RMBG-2.0",
    "briaai/RMBG-1.4",
  ];

  for (const model of models) {
    console.log(`\nTrying ${model}...`);
    try {
      const res = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: new Uint8Array(tinyPng),
          signal: AbortSignal.timeout(10000),
        }
      );
      console.log(`Status: ${res.status}`);
      if (!res.ok) {
        const text = await res.text();
        console.log("Response:", text.slice(0, 300));
      } else {
        const buf = Buffer.from(await res.arrayBuffer());
        console.log(`SUCCESS! Result: ${buf.length} bytes`);
      }
    } catch (e: any) {
      console.log("Error:", e.message);
    }
  }

  // Also test SDXL
  console.log("\nTrying SDXL...");
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: "a plain white wall" }),
        signal: AbortSignal.timeout(30000),
      }
    );
    console.log(`Status: ${res.status}`);
    if (res.ok) console.log("SDXL SUCCESS!");
    else {
      const text = await res.text();
      console.log("Response:", text.slice(0, 300));
    }
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}

main();
