export function cacheKeyIntegrityGuard(fileHash: string) {
  return `uc1:integrity:${fileHash}`;
}

export function cacheKeyMathConsistency(fileHash: string) {
  return `uc1:math:${fileHash}`;
}

export function cacheKeyContentAuditor(fileHash: string) {
  return `uc3:audit:${fileHash}`;
}

export function cacheKeySyllabusDiff(
  oldHash: string,
  newHash: string,
  includeUnchanged: boolean
) {
  return `diff:${oldHash}:${newHash}:${includeUnchanged ? "1" : "0"}`;
}

export function cacheKeySyncMaster(fisaHash: string, planHash: string) {
  return `uc2:sync:${fisaHash}:${planHash}`;
}

export function cacheKeyCompetencyMapper(fisaHash: string, planHash: string) {
  return `uc2:map:${fisaHash}:${planHash}`;
}
