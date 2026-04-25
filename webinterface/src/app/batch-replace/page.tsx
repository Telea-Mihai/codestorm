"use client";

import { useRef, useState } from "react";

import {
  ReplacementRulesEditor,
  replacementRowsToJson,
  type ReplacementRow,
} from "@/components/replacement-rules-editor";
import { StructuredResultView } from "@/components/structured-result-view";
import { postFormData } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const initialRows: ReplacementRow[] = [{ find: "Examen 70%", replace: "Examen 60%" }];

export default function BatchReplacePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ReplacementRow[]>(initialRows);
  const [loading, setLoading] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const collectFiles = () => {
    const input = inputRef.current;
    if (!input?.files?.length) {
      return null;
    }
    return Array.from(input.files);
  };

  const runBatch = async (apply: boolean) => {
    const files = collectFiles();
    if (!files?.length) {
      setError("Add at least one document.");
      return;
    }
    const rulesJson = replacementRowsToJson(rows);
    let parsedRules: unknown;
    try {
      parsedRules = JSON.parse(rulesJson) as unknown;
    } catch {
      setError("Rules could not be serialized.");
      return;
    }
    if (!Array.isArray(parsedRules) || parsedRules.length === 0) {
      setError("Add at least one rule with a non-empty “Find” value.");
      return;
    }
    setLoading(apply ? "apply" : "preview");
    setError(null);
    setResult(null);
    try {
      const data = new FormData();
      for (const f of files) {
        data.append("files", f);
      }
      data.append("replacements", rulesJson);
      data.append("apply", apply ? "true" : "false");
      const payload = await postFormData<unknown>("/uc3/smart-updater", data);
      setResult(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Batch text replacements</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Supply several files plus find-and-replace rules.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Files and rules</CardTitle>
          <CardDescription>PDF and Word are read as text for matching.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="multi">Documents (multi-select)</Label>
            <input
              ref={inputRef}
              id="multi"
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </div>
          <ReplacementRulesEditor rows={rows} onChange={setRows} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading !== null}
              onClick={() => runBatch(false)}
            >
              {loading === "preview" ? "Working…" : "Preview matches only"}
            </Button>
            <Button type="button" disabled={loading !== null} onClick={() => runBatch(true)}>
              {loading === "apply" ? "Working…" : "Apply rules and write export files"}
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {result && (result as any).result?.download_files?.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Download updated files</h3>
              <ul className="space-y-1">
                {(result as any).result.download_files.map((f: any, i: number) => (
                  <li key={i}>
                    <a
                      href={`http://localhost:5000${f.url}`}
                      download={f.name}
                      className="text-blue-600 underline text-sm"
                    >
                      {f.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
