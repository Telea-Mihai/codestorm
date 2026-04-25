"use client";

import { useCallback, useEffect, useState } from "react";

import { deleteUpload, getUpload, listUploads, type UploadRecord } from "@/lib/idb";
import { uploadRecordToFile } from "@/lib/library-file";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function recordMatchesAccept(record: UploadRecord, accept: string): boolean {
  const a = accept.toLowerCase();
  const name = record.displayName.toLowerCase();
  const mime = record.mimeType.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";

  const wants = {
    pdf: a.includes("pdf") || a.includes(".pdf"),
    docx: a.includes("docx") || a.includes("wordprocessingml"),
    txt: a.includes("txt"),
    md: a.includes("md") || a.includes("markdown"),
  };

  const anySpecific = wants.pdf || wants.docx || wants.txt || wants.md;
  if (!anySpecific) {
    return true;
  }

  if (wants.pdf && (mime.includes("pdf") || ext === "pdf")) {
    return true;
  }
  if (wants.docx && (mime.includes("word") || ext === "docx")) {
    return true;
  }
  if (wants.txt && ext === "txt") {
    return true;
  }
  if (wants.md && (ext === "md" || ext === "markdown")) {
    return true;
  }
  return false;
}

type Props = {
  label: string;
  inputId: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  filterSaved?: (record: UploadRecord) => boolean;
};

export function SavedFilePicker({ label, inputId, accept, file, onChange, filterSaved }: Props) {
  const [rows, setRows] = useState<UploadRecord[]>([]);
  const [selectedHash, setSelectedHash] = useState<string>("");

  const refresh = useCallback(async () => {
    try {
      const all = await listUploads();
      setRows(all);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visible = rows.filter((r) => {
    if (filterSaved && !filterSaved(r)) {
      return false;
    }
    return recordMatchesAccept(r, accept);
  });

  const pickSaved = async (hash: string) => {
    if (!hash) {
      onChange(null);
      return;
    }
    const rec = await getUpload(hash);
    if (rec) {
      onChange(uploadRecordToFile(rec));
    }
  };

  const removeSaved = async (hash: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (selectedHash === hash) {
        setSelectedHash("");
        onChange(null);
      }
      await deleteUpload(hash);
      await refresh();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          id={inputId}
          type="file"
          accept={accept}
          className="sm:max-w-xs"
          onChange={(e) => {
            setSelectedHash("");
            onChange(e.target.files?.[0] ?? null);
          }}
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">or</span>
          <select
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            value={selectedHash}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedHash(v);
              void pickSaved(v);
            }}
          >
            <option value="">Saved in this browser…</option>
            {visible.map((r) => (
              <option key={r.hash} value={r.hash}>
                {r.displayName} ({Math.round(r.size / 1024)} KB)
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            Refresh list
          </Button>
        </div>
      </div>
      {file ? (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{file.name}</span> (
          {(file.size / 1024).toFixed(1)} KB)
        </p>
      ) : null}
      {visible.length > 0 ? (
        <ul className="max-h-28 overflow-auto rounded-md border border-border bg-muted/20 px-2 py-1 text-xs text-muted-foreground">
          {visible.map((r) => (
            <li key={r.hash} className="flex items-center justify-between gap-2 py-0.5">
              <span className="truncate">{r.displayName}</span>
              <button
                type="button"
                className="shrink-0 text-destructive hover:underline"
                onClick={(e) => void removeSaved(r.hash, e)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
