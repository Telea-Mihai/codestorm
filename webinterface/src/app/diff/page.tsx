"use client";

import { Suspense, useMemo, useState } from "react";

import { OperationCacheBanner } from "@/components/operation-cache-banner";
import { SavedFilePicker } from "@/components/saved-file-picker";
import { useTwoLibraryFilesFromUrl } from "@/hooks/use-library-file-from-url";
import { useStableFileHash } from "@/hooks/use-stable-file-hash";
import { postFormData } from "@/lib/backend";
import { cacheKeySyllabusDiff } from "@/lib/cache-keys";
import { getCachedOperationResult, setCachedOperationResult } from "@/lib/op-result-cache";
import { sha256Hex } from "@/lib/sha256";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type HunkLine = {
  type: "added" | "removed" | "context";
  old_line: number | null;
  new_line: number | null;
  text: string;
};

type DiffHunk = {
  old_start: number;
  old_length: number;
  new_start: number;
  new_length: number;
  header: string;
  lines: HunkLine[];
};

type DiffResponse = {
  success: boolean;
  summary: {
    old_lines: number;
    new_lines: number;
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
    change_ratio: number;
  };
  hunks: DiffHunk[];
};

function lineStyle(line: HunkLine): string {
  if (line.type === "added") {
    return "bg-emerald-500/10";
  }
  if (line.type === "removed") {
    return "bg-rose-500/10";
  }
  return "bg-zinc-950/10";
}

function linePrefix(line: HunkLine): string {
  if (line.type === "added") {
    return "+";
  }
  if (line.type === "removed") {
    return "-";
  }
  return " ";
}

function numberCell(value: number | null) {
  return value == null ? "" : String(value);
}

function DiffPageContent() {
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [includeContext, setIncludeContext] = useState(true);
  const [layout, setLayout] = useState<"inline" | "split">("inline");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiffResponse | null>(null);

  useTwoLibraryFilesFromUrl(setOldFile, setNewFile, "old", "new");

  const hOld = useStableFileHash(oldFile);
  const hNew = useStableFileHash(newFile);
  const diffCacheKey = hOld && hNew ? cacheKeySyllabusDiff(hOld, hNew, includeContext) : null;
  const cachedResult = diffCacheKey
    ? ((getCachedOperationResult(diffCacheKey) as DiffResponse | null) ?? null)
    : null;
  const visibleResult = result ?? cachedResult;

  const filteredHunks = useMemo(() => {
    if (!visibleResult) {
      return [] as DiffHunk[];
    }
    if (includeContext) {
      return visibleResult.hunks;
    }
    return visibleResult.hunks
      .map((hunk) => ({
        ...hunk,
        lines: hunk.lines.filter((line) => line.type !== "context"),
      }))
      .filter((hunk) => hunk.lines.length > 0);
  }, [visibleResult, includeContext]);

  const runDiff = async () => {
    if (!oldFile || !newFile) {
      setError("Select both the previous and new document.");
      return;
    }
    const data = new FormData();
    data.append("old_file", oldFile);
    data.append("new_file", newFile);
    data.append("include_unchanged", includeContext ? "true" : "false");

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = await postFormData<DiffResponse>("/diff/syllabus", data);
      setResult(payload);
      const a = await sha256Hex(oldFile);
      const b = await sha256Hex(newFile);
      setCachedOperationResult(cacheKeySyllabusDiff(a, b, includeContext), payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Syllabus diff</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Unified hunk comparison with line numbers and contextual blocks, styled like modern code review tools.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
          <CardDescription>Choose previous and new versions (PDF or Word).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OperationCacheBanner cacheKey={diffCacheKey} onApply={(p) => setResult(p as DiffResponse)} />
          <div className="grid gap-4 md:grid-cols-2">
            <SavedFilePicker
              label="Previous syllabus"
              inputId="old"
              accept=".pdf,.docx"
              file={oldFile}
              onChange={(next) => {
                setOldFile(next);
                setResult(null);
              }}
            />
            <SavedFilePicker
              label="New syllabus"
              inputId="new"
              accept=".pdf,.docx"
              file={newFile}
              onChange={(next) => {
                setNewFile(next);
                setResult(null);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                className="size-4 rounded border border-input accent-primary"
              />
              Show context lines
            </label>
            <Button
              type="button"
              size="sm"
              variant={layout === "inline" ? "default" : "outline"}
              onClick={() => setLayout("inline")}
            >
              Inline
            </Button>
            <Button
              type="button"
              size="sm"
              variant={layout === "split" ? "default" : "outline"}
              onClick={() => setLayout("split")}
            >
              Split
            </Button>
          </div>

          <Button type="button" onClick={() => void runDiff()} disabled={loading}>
            {loading ? "Comparing..." : "Compare versions"}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {visibleResult?.success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>
              {visibleResult.summary.added} additions, {visibleResult.summary.removed} removals, {visibleResult.summary.modified} modifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredHunks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hunks to display for current options.</p>
            ) : (
              <div className="space-y-4">
                {filteredHunks.map((hunk, hunkIndex) => (
                  <div key={`${hunk.header}-${hunkIndex}`} className="overflow-hidden rounded-xl border border-border">
                    <div className="border-b border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
                      {hunk.header}
                    </div>

                    {layout === "inline" ? (
                      <table className="w-full text-left font-mono text-xs">
                        <tbody>
                          {hunk.lines.map((line, idx) => (
                            <tr key={`${hunkIndex}-${idx}`} className={`${lineStyle(line)} align-top`}>
                              <td className="w-14 border-r border-border px-2 py-1 text-right text-muted-foreground">
                                {numberCell(line.old_line)}
                              </td>
                              <td className="w-14 border-r border-border px-2 py-1 text-right text-muted-foreground">
                                {numberCell(line.new_line)}
                              </td>
                              <td className="w-5 border-r border-border px-1 py-1 text-muted-foreground">{linePrefix(line)}</td>
                              <td className="whitespace-pre-wrap px-2 py-1 text-foreground">{line.text}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full table-fixed text-left font-mono text-xs">
                        <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                          <tr>
                            <th className="px-2 py-1 font-medium">Old</th>
                            <th className="px-2 py-1 font-medium">New</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hunk.lines.map((line, idx) => (
                            <tr key={`${hunkIndex}-${idx}`} className="align-top">
                              <td
                                className={`w-1/2 border-r border-border px-2 py-1 ${
                                  line.type === "added" ? "bg-zinc-950/30" : lineStyle(line)
                                }`}
                              >
                                <span className="mr-2 inline-block min-w-8 text-right text-muted-foreground">
                                  {numberCell(line.old_line)}
                                </span>
                                {line.type !== "added" ? line.text : ""}
                              </td>
                              <td
                                className={`w-1/2 px-2 py-1 ${
                                  line.type === "removed" ? "bg-zinc-950/30" : lineStyle(line)
                                }`}
                              >
                                <span className="mr-2 inline-block min-w-8 text-right text-muted-foreground">
                                  {numberCell(line.new_line)}
                                </span>
                                {line.type !== "removed" ? line.text : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default function DiffPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading page...</p>}>
      <DiffPageContent />
    </Suspense>
  );
}
