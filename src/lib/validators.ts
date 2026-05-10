import { z } from "zod";

export const trendsQuerySchema = z.object({
  category: z.enum(["challenge", "music", "hashtag", "event"]).optional(),
  sort: z.enum(["heat", "new"]).default("heat"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const generateSchema = z.object({
  topicId: z.string().min(1),
  modelId: z.string().min(1),
  type: z.enum(["image", "video"]),
  prompt: z.string().min(1).max(1000),
  params: z.object({
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    style: z.string().optional(),
  }).optional(),
});
