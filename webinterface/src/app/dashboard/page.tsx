"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { deleteJson, getJson, postFormData } from "@/lib/backend";
import { deleteUpload, listUploads, type UploadRecord } from "@/lib/idb";
import { saveUploadToLibrary } from "@/lib/register-upload";
import { Button } from "@/components/ui/button";

type BackendDocument = {
  hash: string;
  extension: string;
  size: number;
  uploaded_at: number;
};

type DocumentsResponse = {
  success: boolean;
  documents: BackendDocument[];
};

function formatDate(ts?: number): string {
  if (!ts) {
    return "-";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

function fileType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return "PDF";
  }
  if (lower.endsWith(".docx")) {
    return "Word";
  }
  if (lower.endsWith(".md")) {
    return "Markdown";
  }
  if (lower.endsWith(".txt")) {
    return "Text";
  }
  return "Other";
}

export default function DashboardPage() {
  const [rows, setRows] = useState<UploadRecord[]>([]);
  const [backendDocs, setBackendDocs] = useState<Record<string, BackendDocument>>({});
  const [refreshing, setRefreshing] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [saved, remote] = await Promise.all([
        listUploads(),
        getJson<DocumentsResponse>("/documents"),
      ]);

      saved.sort((a, b) => b.savedAt - a.savedAt);
      setRows(saved);

      const next: Record<string, BackendDocument> = {};
      for (const doc of remote.documents ?? []) {
        next[doc.hash] = doc;
      }
      setBackendDocs(next);
    } catch {
      const fallback = await listUploads();
      fallback.sort((a, b) => b.savedAt - a.savedAt);
      setRows(fallback);
      setBackendDocs({});
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rowsWithStatus = useMemo(
    () =>
      rows.map((row) => {
        const remote = backendDocs[row.hash];
        return {
          row,
          remote,
          status: remote ? "Ready" : row.lastServerPath ? "Server link pending" : "Local only",
        };
      }),
    [rows, backendDocs]
  );

  const runUpload = async () => {
    if (!uploadFile) {
      setUploadError("Choose a file first.");
      return;
    }

    setUploadBusy(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      const response = await postFormData<{ success: boolean; filepath: string }>("/upload", form);
      if (!response.success) {
        throw new Error("Upload failed.");
      }

      await saveUploadToLibrary(uploadFile, {
        displayName: uploadFile.name,
        serverPath: response.filepath,
      });

      setUploadFile(null);
      setUploadOpen(false);
      await refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadBusy(false);
    }
  };

  const removeEverywhere = async (hash: string) => {
    try {
      await Promise.allSettled([
        deleteJson<{ success: boolean }>(`/documents/${encodeURIComponent(hash)}`),
        deleteUpload(hash),
      ]);
      await refresh();
    } catch {
      await refresh();
    }
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)] w-full flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/70 px-5 py-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Document Library</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </Button>
          <Button type="button" onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Upload
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/70">
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[880px] table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900 text-zinc-300">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Quick actions</th>
              </tr>
            </thead>
            <tbody>
              {rowsWithStatus.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                    No documents yet. Upload your first course file to begin.
                  </td>
                </tr>
              ) : (
                rowsWithStatus.map(({ row, remote, status }) => (
                  <tr key={row.hash} className="border-b border-zinc-900/80 align-top text-zinc-200">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 rounded-md bg-zinc-900 p-1.5">
                          <FileText className="size-4" aria-hidden />
                        </span>
                        <div>
                          <p className="truncate font-medium mw-50">{row.displayName}</p>
                          <p className="mt-1 text-xs text-zinc-500">{row.hash.slice(0, 12)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{fileType(row.displayName)}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {formatDate(remote?.uploaded_at ?? row.savedAt)}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{(row.size / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" className="h-8">
                          <Link href={`/workspace/${encodeURIComponent(row.hash)}`}>Open</Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                          onClick={() => void removeEverywhere(row.hash)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {uploadOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-50">Upload document</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Add a file to the server and keep a reusable local copy in this browser.
            </p>
            <label htmlFor="upload-popup-file" className="mt-4 block text-sm font-medium text-zinc-300">
              Choose file
            </label>
            <input
              id="upload-popup-file"
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="mt-2 block w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
            {uploadError ? <p className="mt-2 text-sm text-rose-400">{uploadError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-700 bg-transparent"
                onClick={() => {
                  setUploadOpen(false);
                  setUploadFile(null);
                  setUploadError(null);
                }}
                disabled={uploadBusy}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void runUpload()} disabled={uploadBusy || !uploadFile}>
                {uploadBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}