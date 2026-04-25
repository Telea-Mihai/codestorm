"use client";

import { Suspense, useState } from "react";

import { OperationCacheBanner } from "@/components/operation-cache-banner";
import { SavedFilePicker } from "@/components/saved-file-picker";
import { StructuredResultView } from "@/components/structured-result-view";
import { useLibraryFileFromUrl } from "@/hooks/use-library-file-from-url";
import { useStableFileHash } from "@/hooks/use-stable-file-hash";
import { postFormData } from "@/lib/backend";
import {
  cacheKeyIntegrityGuard,
  cacheKeyMathConsistency,
} from "@/lib/cache-keys";
import { getCachedOperationResult, setCachedOperationResult } from "@/lib/op-result-cache";
import { sha256Hex } from "@/lib/sha256";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Envelope = { success?: boolean; result?: unknown; alerts?: unknown; task?: string };

function IntegrityAiPageContent() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [loading, setLoading] = useState<"uc11" | "uc12" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [out11, setOut11] = useState<Envelope | null>(null);
  const [out12, setOut12] = useState<Envelope | null>(null);

  useLibraryFileFromUrl(setFile1, "lib");
  useLibraryFileFromUrl(setFile2, "lib2");

  const hash1 = useStableFileHash(file1);
  const hash2 = useStableFileHash(file2);
  const cache11 = hash1 ? cacheKeyIntegrityGuard(hash1) : null;
  const cache12 = hash2 ? cacheKeyMathConsistency(hash2) : null;
  const cachedOut11 = cache11 ? ((getCachedOperationResult(cache11) as Envelope | null) ?? null) : null;
  const cachedOut12 = cache12 ? ((getCachedOperationResult(cache12) as Envelope | null) ?? null) : null;
  const visibleOut11 = out11 ?? cachedOut11;
  const visibleOut12 = out12 ?? cachedOut12;

  const runUc11 = async () => {
    if (!file1) {
      setError("Choose a document for the integrity check.");
      return;
    }
    setLoading("uc11");
    setError(null);
    setOut11(null);
    try {
      const data = new FormData();
      data.append("file", file1);
      const res = await postFormData<Envelope>("/uc1/integrity-guard", data);
      setOut11(res);
      const h = await sha256Hex(file1);
      setCachedOperationResult(cacheKeyIntegrityGuard(h), res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(null);
    }
  };

  const runUc12 = async () => {
    if (!file2) {
      setError("Choose a document for the math consistency check.");
      return;
    }
    setLoading("uc12");
    setError(null);
    setOut12(null);
    try {
      const data = new FormData();
      data.append("file", file2);
      const res = await postFormData<Envelope>("/uc1/math-consistency", data);
      setOut12(res);
      const h = await sha256Hex(file2);
      setCachedOperationResult(cacheKeyMathConsistency(h), res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrity checks</h1>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrity guard</CardTitle>
          <CardDescription>
            Visual scan for missing sections and empty or placeholder values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OperationCacheBanner cacheKey={cache11} onApply={(p) => setOut11(p as Envelope)} />
          <SavedFilePicker
            label="Document (PDF or Word)"
            inputId="f-uc11"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            file={file1}
            onChange={(next) => {
              setFile1(next);
              setOut11(null);
            }}
          />
          <Button type="button" onClick={runUc11} disabled={loading !== null}>
            {loading === "uc11" ? "Running…" : "Run integrity guard"}
          </Button>
          {visibleOut11 ? <StructuredResultView value={visibleOut11} title="Results" /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Math consistency</CardTitle>
          <CardDescription>
            Extract total hours and evaluation weights; backend adds deterministic alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OperationCacheBanner cacheKey={cache12} onApply={(p) => setOut12(p as Envelope)} />
          <div className="space-y-2">
            <SavedFilePicker
              label="Course sheet (PDF or Word)"
              inputId="f-uc12"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              file={file2}
              onChange={(next) => {
                setFile2(next);
                setOut12(null);
              }}
            />
          </div>
          <Button type="button" onClick={runUc12} disabled={loading !== null}>
            {loading === "uc12" ? "Running…" : "Run math consistency"}
          </Button>
          {visibleOut12 ? <StructuredResultView value={visibleOut12} title="Results" /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function IntegrityAiPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading page…</p>}
    >
      <IntegrityAiPageContent />
    </Suspense>
  );
}
