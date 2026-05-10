import { Queue } from "bullmq";
import { redis } from "./redis";

export const trendQueue = new Queue("trend-queue", { connection: redis });
export const imageQueue = new Queue("image-queue", { connection: redis });
export const videoQueue = new Queue("video-queue", { connection: redis });
export const suggestQueue = new Queue("suggest-queue", { connection: redis });
export const swapQueue = new Queue("swap-queue", { connection: redis });
