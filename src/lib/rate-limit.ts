const rateMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ENTRIES = 10000;

function evictOldest() {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  for (const [key, entry] of rateMap) {
    if (entry.resetAt < oldestTime) { oldestTime = entry.resetAt; oldestKey = key; }
  }
  if (oldestKey) rateMap.delete(oldestKey);
}

export function checkRateLimit(key: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);

  // Lazy cleanup: remove stale entry on access
  if (entry && now > entry.resetAt) {
    rateMap.delete(key);
  }

  if (!entry || now > entry.resetAt) {
    // Evict oldest if map is too large
    if (rateMap.size >= MAX_ENTRIES) evictOldest();
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count++;
  return true;
}
