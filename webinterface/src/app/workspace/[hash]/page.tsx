"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, Check, Highlighter, MessageSquarePlus, Save, Trash2 } from "lucide-react";

import { backendUrl, getJson, putJson } from "@/lib/backend";
import {
  deleteAnnotation,
  deleteMarkdownDraft,
  getMarkdownDraft,
  listAnnotations,
  putAnnotation,
  putMarkdownDraft,
  type AnnotationRecord,
} from "@/lib/idb";
import { Button } from "@/components/ui/button";

type ContentResponse = {
  success: boolean;
  document: {
    hash: string;
    filename: string;
    extension: string;
    is_pdf: boolean;
    is_docx: boolean;
    viewer_url: string;
  };
  markdown: string;
  parsed_text: string;
};

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function WorkspaceDocumentPage() {
  const params = useParams<{ hash: string }>();
  const hash = decodeURIComponent(params.hash ?? "").trim();

  const [mode, setMode] = useState<"document" | "markdown">("document");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [doc, setDoc] = useState<ContentResponse["document"] | null>(null);
  const [parsedText, setParsedText] = useState("");
  const [markdown, setMarkdown] = useState("");

  const [annotations, setAnnotations] = useState<AnnotationRecord[]>([]);
  const [noteText, setNoteText] = useState("");
  const [selection, setSelection] = useState<{ start: number; end: number; snippet: string } | null>(null);

  const markdownRef = useRef<HTMLTextAreaElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getJson<ContentResponse>(`/documents/${encodeURIComponent(hash)}/content`);
      setDoc(payload.document);
      setParsedText(payload.parsed_text ?? "");

      const draft = await getMarkdownDraft(hash);
      setMarkdown(draft?.markdown ?? payload.markdown ?? "");

      const rows = await listAnnotations(hash);
      setAnnotations(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load document.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hash) {
      return;
    }
    void load();
  }, [hash]);

  useEffect(() => {
    const key = `workspace-mode:${hash}`;
    const stored = localStorage.getItem(key);
    if (stored === "document" || stored === "markdown") {
      setMode(stored);
    }
  }, [hash]);

  useEffect(() => {
    localStorage.setItem(`workspace-mode:${hash}`, mode);
  }, [hash, mode]);

  const highlightedPreview = useMemo(() => {
    if (!parsedText) {
      return "";
    }
    if (annotations.length === 0) {
      return parsedText;
    }

    let next = parsedText;
    for (const item of annotations) {
      if (!item.snippet) {
        continue;
      }
      const marker = `[[highlight::${item.id}::${item.snippet}::end]]`;
      next = next.replace(item.snippet, marker);
    }
    return next;
  }, [parsedText, annotations]);

  const captureSelection = () => {
    const target = markdownRef.current;
    if (!target) {
      return;
    }
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const snippet = markdown.slice(start, end).trim();
    if (!snippet) {
      setSelection(null);
      return;
    }
    setSelection({ start, end, snippet });
  };

  const addAnnotation = async () => {
    if (!selection?.snippet) {
      setError("Select text in the markdown editor first.");
      return;
    }
    const comment = noteText.trim();
    if (!comment) {
      setError("Write a comment before adding a note.");
      return;
    }

    const record: AnnotationRecord = {
      id: makeId(),
      docHash: hash,
      snippet: selection.snippet,
      comment,
      color: "yellow",
      startOffset: selection.start,
      endOffset: selection.end,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await putAnnotation(record);
    const rows = await listAnnotations(hash);
    setAnnotations(rows);
    setSelection(null);
    setNoteText("");
    setError(null);
  };

  const removeAnnotation = async (id: string) => {
    await deleteAnnotation(id);
    const rows = await listAnnotations(hash);
    setAnnotations(rows);
  };

  const saveMarkdown = async () => {
    setSaving(true);
    setSavedMessage(null);
    setError(null);
    try {
      await putJson(`/documents/${encodeURIComponent(hash)}/markdown`, { markdown });
      await putMarkdownDraft({ docHash: hash, markdown, savedAt: Date.now() });
      setSavedMessage("Saved markdown to backend and local draft.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save markdown.");
    } finally {
      setSaving(false);
    }
  };

  const clearDraft = async () => {
    await deleteMarkdownDraft(hash);
    setSavedMessage("Local draft cleared.");
  };

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading document workspace...</p>;
  }

  return (
    <div className="grid h-full min-h-[calc(100vh-7rem)] grid-cols-1 gap-4 xl:grid-cols-[1fr_330px]">
      <section className="min-h-0 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">{doc?.filename ?? hash}</h1>
            <p className="text-xs text-zinc-500">Document workspace</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="border-zinc-700 bg-transparent">
              <span>
              <ArrowLeftIcon className="size-4" aria-hidden />
              <Link href="/dashboard">Back to library</Link>
              </span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "document" ? "default" : "outline"}
              className={mode === "document" ? "" : "border-zinc-700 bg-transparent"}
              onClick={() => setMode("document")}
            >
              Document
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "markdown" ? "default" : "outline"}
              className={mode === "markdown" ? "" : "border-zinc-700 bg-transparent"}
              onClick={() => setMode("markdown")}
            >
              Markdown
            </Button>
          </div>
        </div>

        {mode === "document" ? (
          <div className="min-h-[68vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
            {doc?.is_pdf ? (
              <iframe
                title="PDF document viewer"
                src={backendUrl(`/documents/${encodeURIComponent(hash)}/file`)}
                className="h-[68vh] w-full"
              />
            ) : (
              <div className="h-[68vh] overflow-auto p-4">
                <p className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Word files open in text fallback mode. Parsed content is shown below so you can still review and annotate.
                </p>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{highlightedPreview || parsedText || "No parsed text available."}</pre>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={() => void saveMarkdown()} disabled={saving}>
                <Save className="size-4" aria-hidden />
                {saving ? "Saving..." : "Save markdown"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-zinc-700 bg-transparent"
                onClick={() => void clearDraft()}
              >
                <Trash2 className="size-4" aria-hidden />
                Clear local draft
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-zinc-700 bg-transparent"
                onClick={captureSelection}
              >
                <Highlighter className="size-4" aria-hidden />
                Capture selection
              </Button>
            </div>
            <textarea
              ref={markdownRef}
              className="h-[66vh] w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-mono text-sm text-zinc-100 outline-none focus:border-zinc-600"
              value={markdown}
              onChange={async (e) => {
                const next = e.target.value;
                setMarkdown(next);
                await putMarkdownDraft({ docHash: hash, markdown: next, savedAt: Date.now() });
              }}
              onMouseUp={captureSelection}
              onKeyUp={captureSelection}
            />
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
        {savedMessage ? (
          <p className="mt-3 inline-flex items-center gap-1 text-sm text-emerald-300">
            <Check className="size-4" aria-hidden />
            {savedMessage}
          </p>
        ) : null}
      </section>

      <aside className="min-h-0 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-zinc-50">Comments and highlights</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Notes are saved locally in this browser for now.
          </p>
        </div>

        <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
          <p className="text-xs font-medium text-zinc-300">Selected text</p>
          <p className="max-h-20 overflow-auto text-xs text-zinc-400">
            {selection?.snippet || "Capture a selection in markdown mode."}
          </p>
          <textarea
            className="h-24 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100 outline-none focus:border-zinc-600"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add teaching note..."
          />
          <Button type="button" size="sm" className="w-full" onClick={() => void addAnnotation()}>
            <MessageSquarePlus className="size-4" aria-hidden />
            Add note
          </Button>
        </div>

        <div className="mt-3 max-h-[52vh] space-y-2 overflow-auto">
          {annotations.length === 0 ? (
            <p className="text-xs text-zinc-500">No notes yet.</p>
          ) : (
            annotations.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                <p className="text-xs font-medium text-zinc-200">{item.comment}</p>
                <p className="mt-1 max-h-20 overflow-auto text-xs text-zinc-500">{item.snippet}</p>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                    onClick={() => void removeAnnotation(item.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
