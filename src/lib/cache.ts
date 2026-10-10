// In-memory TTL cache. Per server instance (fine for judging traffic).
// Swap for MongoDB/Redis later by keeping the same get/set signature.

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export const ONE_HOUR_MS = 60 * 60 * 1000;

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = ONE_HOUR_MS): T {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  return cacheSet(key, await fn(), ttlMs);
}

/** Bucket a Date to the top of its UTC hour, as ISO. Cache keys use this. */
export function hourBucket(d: Date): string {
  const h = new Date(d);
  h.setUTCMinutes(0, 0, 0);
  return h.toISOString();
}
