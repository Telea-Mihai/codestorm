"use client";

import { useCallback, useEffect, useState } from "react";

import { deleteTemplate, listTemplates, putTemplate, type TemplateRecord } from "@/lib/idb";
import { templateRecordToFile } from "@/lib/template-file";
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

export default function TemplatesPage() {
  const [rows, setRows] = useState<TemplateRecord[]>([]);
  const [newName, setNewName] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [replaceFiles, setReplaceFiles] = useState<Record<string, File | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listTemplates();
      list.sort((a, b) => b.savedAt - a.savedAt);
      setRows(list);
      setEdits((prev) => {
        const next = { ...prev };
        for (const r of list) {
          if (next[r.id] === undefined) {
            next[r.id] = r.name;
          }
        }
        return next;
      });
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTemplate = async () => {
    if (!newFile || !newName.trim()) {
      setError("Enter a display name and choose a .docx file.");
      return;
    }
    if (!newFile.name.toLowerCase().endsWith(".docx")) {
      setError("Templates must be Word .docx files.");
      return;
    }
    setBusy("add");
    setError(null);
    try {
      const id = crypto.randomUUID();
      await putTemplate({
        id,
        name: newName.trim(),
        savedAt: Date.now(),
        blob: newFile,
      });
      setNewName("");
      setNewFile(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save template.");
    } finally {
      setBusy(null);
    }
  };

  const saveRow = async (row: TemplateRecord) => {
    const name = (edits[row.id] ?? row.name).trim();
    if (!name) {
      setError("Template name cannot be empty.");
      return;
    }
    setBusy(row.id);
    setError(null);
    try {
      const replacement = replaceFiles[row.id];
      const blob = replacement ?? row.blob;
      await putTemplate({
        id: row.id,
        name,
        savedAt: Date.now(),
        blob,
      });
      setReplaceFiles((p) => ({ ...p, [row.id]: null }));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update template.");
    } finally {
      setBusy(null);
    }
  };

  const removeRow = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await deleteTemplate(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusy(null);
    }
  };

  const downloadRow = (row: TemplateRecord) => {
    const file = templateRecordToFile(row);
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Word templates</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add and edit .docx templates stored only in this browser (IndexedDB). Use them from{" "}
          <span className="font-medium text-foreground">Plan alignment</span> when bootstrapping a
          draft, or download a copy anytime.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add template</CardTitle>
          <CardDescription>Pick a display name and a .docx file. Nothing is sent until you run a tool.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Display name</Label>
            <Input
              id="tpl-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Fișă disciplinei 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-file">Word file (.docx)</Label>
            <Input
              id="tpl-file"
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="button" onClick={() => void addTemplate()} disabled={busy !== null}>
            {busy === "add" ? "Saving…" : "Save template in browser"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved templates</CardTitle>
          <CardDescription>Edit the label, replace the file, or remove entries you no longer need.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet. Add one above.</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="space-y-3 rounded-lg border border-border bg-muted/10 p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${row.id}`}>Name</Label>
                    <Input
                      id={`name-${row.id}`}
                      value={edits[row.id] ?? row.name}
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [row.id]: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`rep-${row.id}`}>Replace file (optional)</Label>
                    <Input
                      id={`rep-${row.id}`}
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) =>
                        setReplaceFiles((p) => ({
                          ...p,
                          [row.id]: e.target.files?.[0] ?? null,
                        }))
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated {new Date(row.savedAt).toLocaleString()} · on-disk size{" "}
                  {Math.round(row.blob.size / 1024)} KB
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void saveRow(row)}
                    disabled={busy !== null}
                  >
                    {busy === row.id ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => downloadRow(row)}
                    disabled={busy !== null}
                  >
                    Download .docx
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => void removeRow(row.id)}
                    disabled={busy !== null}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
