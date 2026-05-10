import OpenAI from "openai";
import { ModelAdapter, GenParams, GenResult } from "./types";

export class OpenAIAdapter implements ModelAdapter {
  private client: OpenAI;

  constructor(config: { apiKey: string }) {
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async generateImage(params: GenParams): Promise<GenResult> {
    const response = await this.client.images.generate({
      model: "dall-e-3",
      prompt: params.prompt,
      n: 1,
      size: (params.width && params.height)
        ? `${params.width}x${params.height}` as any
        : "1024x1024",
    });

    return {
      fileUrl: response.data[0].url!,
      metadata: { revised_prompt: response.data[0].revised_prompt },
    };
  }

  async generateVideo(_params: GenParams): Promise<GenResult> {
    throw new Error("Video generation not supported by this model");
  }
}
