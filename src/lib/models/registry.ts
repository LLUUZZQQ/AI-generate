import { prisma } from "@/lib/db";
import { ModelAdapter } from "./types";
import { OpenAIAdapter } from "./openai";

const adapters: Record<string, ModelAdapter> = {};

export async function getModelAdapter(modelId: string): Promise<ModelAdapter> {
  if (adapters[modelId]) return adapters[modelId];

  const model = await prisma.modelProvider.findUnique({ where: { id: modelId } });
  if (!model) throw new Error(`Model ${modelId} not found`);

  let adapter: ModelAdapter;
  switch (model.provider) {
    case "openai": adapter = new OpenAIAdapter(model.config as any); break;
    default: throw new Error(`Unknown provider: ${model.provider}`);
  }

  adapters[modelId] = adapter;
  return adapter;
}
