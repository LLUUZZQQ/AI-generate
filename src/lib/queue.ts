import { Queue } from "bullmq";
import { getRedis } from "./redis";

let _trend: Queue | null = null;
let _image: Queue | null = null;
let _video: Queue | null = null;
let _suggest: Queue | null = null;
let _swap: Queue | null = null;
let _bgReplace: Queue | null = null;

function getQueue(name: string, cache: { current: Queue | null }): Queue | null {
  if (cache.current) return cache.current;
  const r = getRedis();
  if (!r) return null;
  cache.current = new Queue(name, { connection: r });
  return cache.current;
}

export const trendQueue = { get: () => getQueue("trend-queue", { current: _trend }) };
export const imageQueue = { get: () => getQueue("image-queue", { current: _image }) };
export const videoQueue = { get: () => getQueue("video-queue", { current: _video }) };
export const suggestQueue = { get: () => getQueue("suggest-queue", { current: _suggest }) };
export const swapQueue = { get: () => getQueue("swap-queue", { current: _swap }) };
export const bgReplaceQueue = { get: () => getQueue("bg-replace-queue", { current: _bgReplace }) };
