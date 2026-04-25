"use client";

import { useEffect, useState } from "react";

import {
  clearCachedOperationResult,
  formatCacheAge,
  getCachedOperation,
} from "@/lib/op-result-cache";
import { Button } from "@/components/ui/button";

type Props = {
  cacheKey: string | null;
  onApply: (payload: unknown) => void;
};

export function OperationCacheBanner({ cacheKey, onApply }: Props) {
  const [entry, setEntry] = useState<{ result: unknown; savedAt: number } | null>(null);

  useEffect(() => {
    if (!cacheKey) {
      setEntry(null);
      return;
    }
    setEntry(getCachedOperation(cacheKey));
  }, [cacheKey]);

  if (!cacheKey || !entry) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p className="text-muted-foreground">
        Cached API result from{" "}
        <span className="font-medium text-foreground">{formatCacheAge(entry.savedAt)}</span> for
        this selection.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => onApply(entry.result)}>
          Use cached result
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            clearCachedOperationResult(cacheKey);
            setEntry(null);
          }}
        >
          Forget cache
        </Button>
      </div>
    </div>
  );
}
