"use client";

import { useEffect, useState } from "react";

import { sha256Hex } from "@/lib/sha256";

export function useStableFileHash(file: File | null): string | null {
  const [hash, setHash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!file) {
      setHash(null);
      return;
    }
    void sha256Hex(file).then((h) => {
      if (!cancelled) {
        setHash(h);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  return hash;
}
