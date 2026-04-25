"use client";

import { Suspense, useState } from "react";

import { OperationCacheBanner } from "@/components/operation-cache-banner";
import { SavedFilePicker } from "@/components/saved-file-picker";
import { StructuredResultView } from "@/components/structured-result-view";
import { useLibraryFileFromUrl } from "@/hooks/use-library-file-from-url";
import { useStableFileHash } from "@/hooks/use-stable-file-hash";
import { postFormData } from "@/lib/backend";
import { cacheKeyContentAuditor } from "@/lib/cache-keys";
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

type AuditorEnvelope = {
  success?: boolean;
  result?: unknown;
};

function AuditPageContent() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AuditorEnvelope | null>(null);

  useLibraryFileFromUrl(setFile, "lib");

  const fileHash = useStableFileHash(file);
  const cacheKey = fileHash ? cacheKeyContentAuditor(fileHash) : null;
  const cachedPayload = cacheKey
    ? ((getCachedOperationResult(cacheKey) as AuditorEnvelope | null) ?? null)
    : null;
  const visiblePayload = payload ?? cachedPayload;

  const handleRunQualityAudit = async () => {
    if (!file) {
      setError("Select a syllabus or course outline file.");
      return;
    }
    setLoading(true);
    setError(null);
    setPayload(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await postFormData<AuditorEnvelope>("/uc3/content-auditor", data);
      setPayload(res);
      const h = await sha256Hex(file);
      setCachedOperationResult(cacheKeyContentAuditor(h), res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Syllabus quality audit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Detects very generic section titles, checks whether bibliography years look recent enough,
          and validates the shape of external links. Cached locally per file until cleared. Open from{" "}
          <a className="text-primary underline-offset-2 hover:underline" href="/dashboard">
            Documents
          </a>{" "}
          with <span className="font-mono text-xs">?lib=</span> to pre-select a file.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document</CardTitle>
          <CardDescription>PDF, Word, plain text, or Markdown.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OperationCacheBanner
            cacheKey={cacheKey}
            onApply={(p) => setPayload(p as AuditorEnvelope)}
          />
          <SavedFilePicker
            label="File to analyse"
            inputId="audit-file"
            accept=".pdf,.docx,.txt,.md"
            file={file}
            onChange={(next) => {
              setFile(next);
              setPayload(null);
            }}
          />
          <Button type="button" onClick={handleRunQualityAudit} disabled={loading}>
            {loading ? "Analysing…" : "Run full document audit"}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {visiblePayload ? <StructuredResultView value={visiblePayload} title="Audit results" /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading page…</p>}>
      <AuditPageContent />
    </Suspense>
  );
}
