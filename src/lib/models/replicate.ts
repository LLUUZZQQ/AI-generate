import Replicate from "replicate";
import { ModelAdapter, GenParams, GenResult } from "./types";

export class ReplicateAdapter implements ModelAdapter {
  private client: Replicate;

  constructor(config: { apiToken: string }) {
    this.client = new Replicate({ auth: config.apiToken });
  }

  async generateImage(params: GenParams & { referenceImage?: string }): Promise<GenResult> {
    const input: Record<string, any> = {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || "blurry, low quality, distorted",
      width: params.width || 1024,
      height: params.height || 1024,
      num_outputs: 1,
    };

    let model: `${string}/${string}:${string}`;

    if (params.referenceImage) {
      // Image-to-Image with reference
      model = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";
      input.image = params.referenceImage;
      input.strength = 0.7; // How much to follow the reference (0-1, lower = more creative)
    } else {
      // Text-to-Image
      model = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";
    }

    const output = await this.client.run(model, { input });
    const url = Array.isArray(output) ? output[0] : (output as any)?.url;

    return {
      fileUrl: typeof url === "string" ? url : "",
      metadata: { model, input: { ...input, referenceImage: params.referenceImage ? "[uploaded]" : undefined } },
    };
  }

  async generateVideo(_params: GenParams): Promise<GenResult> {
    throw new Error("Video generation not supported by this adapter. Use a dedicated video model.");
  }

  // Character swap: replace person in reference video with user's photo
  async generateSwap(params: GenParams & { referenceVideo?: string; characterPhoto?: string }): Promise<GenResult> {
    // Using Viggle AI or AnimateAnyone via Replicate
    // For now, use a template-based approach with AnimateAnyone
    const model: `${string}/${string}:${string}` = "lucataco/animate-anyone:f45c29b28c9c53a4526c32e29bc9b6d3119166053b8bd2ca662c3eb7dfc4179f";

    const output = await this.client.run(model, {
      input: {
        image: params.characterPhoto,
        video: params.referenceVideo || "https://example.com/default-dance.mp4",
      },
    });

    const url = Array.isArray(output) ? output[0] : (output as any)?.video || (output as any)?.url;

    return {
      fileUrl: typeof url === "string" ? url : "",
      metadata: { model, type: "character-swap" },
    };
  }
}
