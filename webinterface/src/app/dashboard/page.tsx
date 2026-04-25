"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Trash2 } from "lucide-react";

import { deleteJson, getJson } from "@/lib/backend";
import { deleteUpload, listUploads, type UploadRecord } from "@/lib/idb";
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
    </div>
  );
}
