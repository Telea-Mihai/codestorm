"use client";

import Link from "next/link";
import { useState } from "react";

import { postFormData } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveUploadToLibrary } from "@/lib/register-upload";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [keepCopy, setKeepCopy] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryMsg, setLibraryMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    filepath?: string;
    error?: string;
  } | null>(null);

  const handleSendToServer = async () => {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setLibraryMsg(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const payload = await postFormData<{ success: boolean; filepath: string }>("/upload", data);
      setResult(payload);
      if (keepCopy && payload.success) {
        try {
          await saveUploadToLibrary(file, {
            serverPath: payload.filepath,
            displayName: file.name,
          });
          setLibraryMsg("A copy was saved in this browser for reuse on other pages.");
        } catch {
          setLibraryMsg("Could not save a local copy (storage blocked or full).");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload document</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stores the file on the server (deduplicated by content hash) and returns the saved path.
          You can also keep a copy in this browser to pick it later on integrity, diff, audit, and
          plan tools without browsing your disk again.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select file</CardTitle>
          <CardDescription>Any syllabus or template you want the backend to keep.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={keepCopy}
              onChange={(e) => setKeepCopy(e.target.checked)}
              className="mt-0.5 size-4 rounded border border-input accent-primary"
            />
            <span>
              Also save a copy in this browser&apos;s library (IndexedDB) for quick reuse on other
              tools.
            </span>
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" onClick={handleSendToServer} disabled={loading || !file}>
            {loading ? "Uploading…" : "Save file on server"}
          </Button>
          {libraryMsg ? (
            <p className="text-sm text-muted-foreground" role="status">
              {libraryMsg}
            </p>
          ) : null}
          {result?.success ? (
            <div className="space-y-3 rounded-lg border border-emerald-600/40 bg-emerald-950/20 p-4">
              <p className="text-sm font-semibold text-emerald-100">File saved on the server</p>
              <p className="break-all font-mono text-xs text-muted-foreground">{result.filepath}</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard">Open in Documents</Link>
                </Button>
              </div>
            </div>
          ) : result ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {String((result as { error?: string }).error ?? "Upload was not successful.")}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
