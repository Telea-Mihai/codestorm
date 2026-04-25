"use client";

import { Suspense, useMemo, useState } from "react";

import DiffEditorView from "@/components/diff/DiffEditorView";
import DiffHeader from "@/components/diff/DiffHeader";
import DiffSidebar from "@/components/diff/DiffSidebar";
import DiffStats from "@/components/diff/DiffStats";
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

type Row = {
  color: "green" | "red" | "none";
  left: string;
  right: string;
  status: "added" | "removed" | "modified" | "unchanged";
};

type DiffResponse = {
  success: boolean;
  summary: {  };
  rows: Row[];
};

type ChangeItem = {
  type: "added" | "removed" | "modified";
  label: string;
  detail: string;
};

function DiffPageContent() {
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [includeContext, setIncludeContext] = useState(true);
  const [mode, setMode] = useState<"side-by-side" | "inline">("side-by-side");

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
  if (!visibleResult?.rows) return [];

  const lines: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;

  visibleResult.rows.forEach((row, index) => {
    const isChange = row.status !== "unchanged";

    if (!currentHunk && isChange) {
      currentHunk = {
        old_start: index,
        old_length: 0,
        new_start: index,
        new_length: 0,
        header: `Change at line ${index + 1}`,
        lines: [],
      };
    }

    if (currentHunk) {
      const type =
        row.status === "added"
          ? "added"
          : row.status === "removed"
          ? "removed"
          : row.status === "modified"
          ? "context" // treat modified as mixed
          : "context";

      currentHunk.lines.push({
        type,
        old_line: index + 1,
        new_line: index + 1,
        text: row.right || row.left,
      });

      if (!isChange && includeContext === false) {
        lines.push(currentHunk);
        currentHunk = null;
      }
    }
  });

  if (currentHunk) lines.push(currentHunk);

  return lines;
}, [visibleResult, includeContext]);

  const changes = useMemo<ChangeItem[]>(() => {
    const next: ChangeItem[] = [];
    for (const hunk of filteredHunks) {
      const hasAdded = hunk.lines.some((line) => line.type === "added");
      const hasRemoved = hunk.lines.some((line) => line.type === "removed");
      const type: ChangeItem["type"] = hasAdded && hasRemoved ? "modified" : hasAdded ? "added" : "removed";
      next.push({
        type,
        label: hunk.header,
        detail: `${hunk.lines.length} lines in this block`,
      });
    }
    return next;
  }, [filteredHunks]);

  const editorText = useMemo(() => {
    if (filteredHunks.length === 0) {
      return {
        original: "",
        modified: "",
      };
    }

    const originalLines: string[] = [];
    const modifiedLines: string[] = [];

    for (const hunk of filteredHunks) {
      for (const line of hunk.lines) {
        if (line.type !== "added") {
          originalLines.push(line.text);
        }
        if (line.type !== "removed") {
          modifiedLines.push(line.text);
        }
      }
    }

    return {
      original: originalLines.join("\n"),
      modified: modifiedLines.join("\n"),
    };
  }, [filteredHunks]);

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
      console.log("Diff result:", payload);
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
    <div className="flex h-full min-h-[calc(100vh-9rem)] flex-col gap-5 overflow-hidden">
      <DiffHeader renderSide={mode} onChange={setMode} />

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
          </div>

          <Button type="button" onClick={() => void runDiff()} disabled={loading}>
            {loading ? "Comparing..." : "Compare versions"}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {visibleResult?.success ? <DiffStats changes={changes} /> : null}

      {visibleResult?.success ? (
        <div className="flex min-h-150 flex-1 gap-4">
          <DiffEditorView original={editorText.original} modified={editorText.modified} mode={mode} />
          <DiffSidebar changes={changes} />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run Comparison</CardTitle>
            <CardDescription>Pick two files and click Compare versions to load the diff view.</CardDescription>
          </CardHeader>
        </Card>
      )}
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
