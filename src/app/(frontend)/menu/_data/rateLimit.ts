const hitMap = new Map<string, number[]>()

/**
 * In-memory hits per key (rem0018 phase 3 step 1: guest orders per ip + table). One server
 * process, as on staging; resets on a restart. Several instances would need a shared store
 * (Postgres or Redis) behind `allowHit`. rem0016's form renderer has the same helper: promote one
 * to `src/common/utils/` when both are on staging.
 */
export const allowHit = (key: string, limit: number, windowMs: number, now: number): boolean => {
  const windowStart = now - windowMs
  const existing = hitMap.get(key) ?? []
  const recent = existing.filter((timestamp) => timestamp > windowStart)
  if (recent.length >= limit) {
    hitMap.set(key, recent)
    return false
  }
  recent.push(now)
  hitMap.set(key, recent)
  return true
}
