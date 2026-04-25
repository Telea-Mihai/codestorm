const LS_KEY = "codestorm-op-results";
const MAX_ENTRIES = 48;

type CacheEntry = {
  key: string;
  savedAt: number;
  result: unknown;
};

type CacheRoot = {
  entries: CacheEntry[];
};

function readRoot(): CacheRoot {
  if (typeof window === "undefined") {
    return { entries: [] };
  }
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) {
      return { entries: [] };
    }
    const parsed = JSON.parse(raw) as CacheRoot;
    if (!parsed || !Array.isArray(parsed.entries)) {
      return { entries: [] };
    }
    return parsed;
  } catch {
    return { entries: [] };
  }
}

function writeRoot(root: CacheRoot) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(root));
  } catch {
    const trimmed = { entries: root.entries.slice(-Math.floor(MAX_ENTRIES / 2)) };
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
    } catch {
      /* ignore quota */
    }
  }
}

export function getCachedOperationResult(cacheKey: string): unknown | null {
  const hit = getCachedOperation(cacheKey);
  return hit?.result ?? null;
}

export function getCachedOperation(cacheKey: string): { result: unknown; savedAt: number } | null {
  const root = readRoot();
  const hit = root.entries.find((e) => e.key === cacheKey);
  return hit ? { result: hit.result, savedAt: hit.savedAt } : null;
}

export function setCachedOperationResult(cacheKey: string, result: unknown) {
  const root = readRoot();
  const next = root.entries.filter((e) => e.key !== cacheKey);
  next.push({ key: cacheKey, savedAt: Date.now(), result });
  next.sort((a, b) => a.savedAt - b.savedAt);
  while (next.length > MAX_ENTRIES) {
    next.shift();
  }
  writeRoot({ entries: next });
}

export function clearCachedOperationResult(cacheKey: string) {
  const root = readRoot();
  writeRoot({ entries: root.entries.filter((e) => e.key !== cacheKey) });
}

export function formatCacheAge(savedAt: number): string {
  const diff = Date.now() - savedAt;
  if (diff < 60_000) {
    return "just now";
  }
  if (diff < 3_600_000) {
    return `${Math.round(diff / 60_000)} min ago`;
  }
  if (diff < 86_400_000) {
    return `${Math.round(diff / 3_600_000)} h ago`;
  }
  return new Date(savedAt).toLocaleString();
}

