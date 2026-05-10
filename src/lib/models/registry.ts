import { prisma } from "@/lib/db";
import { ModelAdapter, SwapAdapter } from "./types";
import { OpenAIAdapter } from "./openai";
import { ReplicateAdapter } from "./replicate";

const adapters: Record<string, ModelAdapter> = {};
const swapAdapters: Record<string, SwapAdapter> = {};

export async function getModelAdapter(modelId: string): Promise<ModelAdapter> {
  if (adapters[modelId]) return adapters[modelId];

  const model = await prisma.modelProvider.findUnique({ where: { id: modelId } });
  if (!model) throw new Error(`Model ${modelId} not found`);

  let adapter: ModelAdapter;
  switch (model.provider) {
    case "openai": adapter = new OpenAIAdapter(model.config as any); break;
    case "replicate": adapter = new ReplicateAdapter(model.config as any); break;
    default: throw new Error(`Unknown provider: ${model.provider}`);
  }

  adapters[modelId] = adapter;
  return adapter;
}

export async function getSwapAdapter(modelId: string): Promise<SwapAdapter> {
  if (swapAdapters[modelId]) return swapAdapters[modelId];

  const model = await prisma.modelProvider.findUnique({ where: { id: modelId } });
  if (!model) throw new Error(`Model ${modelId} not found`);

  let adapter: SwapAdapter;
  switch (model.provider) {
    case "replicate": adapter = new ReplicateAdapter(model.config as any); break;
    default: throw new Error(`Swap not supported by provider: ${model.provider}`);
  }

  swapAdapters[modelId] = adapter;
  return adapter;
}
