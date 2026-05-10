import { z } from "zod";

export const trendsQuerySchema = z.object({
  category: z.enum(["challenge", "music", "hashtag", "event"]).optional(),
  sort: z.enum(["heat", "new"]).default("heat"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// (other schemas for later tasks can be added here)
