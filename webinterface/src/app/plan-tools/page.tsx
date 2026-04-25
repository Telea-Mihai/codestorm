"use client";

import { Suspense, useCallback, useEffect, useState } from "react";

import { OperationCacheBanner } from "@/components/operation-cache-banner";
import { SavedFilePicker } from "@/components/saved-file-picker";
import { StructuredResultView } from "@/components/structured-result-view";
import { useLibraryFileFromUrl } from "@/hooks/use-library-file-from-url";
import { useStableFileHash } from "@/hooks/use-stable-file-hash";
import { downloadBlobFromFormData, postFormData } from "@/lib/backend";
import { cacheKeyCompetencyMapper, cacheKeySyncMaster } from "@/lib/cache-keys";
import { getTemplate, listTemplates, type TemplateRecord } from "@/lib/idb";
import { getCachedOperationResult, setCachedOperationResult } from "@/lib/op-result-cache";
import { sha256Hex } from "@/lib/sha256";
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

type Envelope = { success?: boolean; result?: unknown; task?: string };

type TemplateSource = "server" | "disk" | "saved";

function PlanToolsPageContent() {
  const [fisa21, setFisa21] = useState<File | null>(null);
  const [plan21, setPlan21] = useState<File | null>(null);
  const [fisa22, setFisa22] = useState<File | null>(null);
  const [plan22, setPlan22] = useState<File | null>(null);
  const [plan4, setPlan4] = useState<File | null>(null);
  const [subject4, setSubject4] = useState("");
  const [template4, setTemplate4] = useState<File | null>(null);
  const [templateSource, setTemplateSource] = useState<TemplateSource>("server");
  const [savedTemplateId, setSavedTemplateId] = useState("");
  const [templateRows, setTemplateRows] = useState<TemplateRecord[]>([]);

  const [loading, setLoading] = useState<"21" | "22" | "4" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [out21, setOut21] = useState<Envelope | null>(null);
  const [out22, setOut22] = useState<Envelope | null>(null);
  const [bootstrapMsg, setBootstrapMsg] = useState<string | null>(null);

  useLibraryFileFromUrl(setFisa21, "fisa");
  useLibraryFileFromUrl(setFisa22, "fisa");
  useLibraryFileFromUrl(setPlan21, "plan");
  useLibraryFileFromUrl(setPlan22, "plan");

  const hf21 = useStableFileHash(fisa21);
  const hp21 = useStableFileHash(plan21);
  const hf22 = useStableFileHash(fisa22);
  const hp22 = useStableFileHash(plan22);
  const cache21 = hf21 && hp21 ? cacheKeySyncMaster(hf21, hp21) : null;
  const cache22 = hf22 && hp22 ? cacheKeyCompetencyMapper(hf22, hp22) : null;
  const cachedOut21 = cache21 ? ((getCachedOperationResult(cache21) as Envelope | null) ?? null) : null;
  const cachedOut22 = cache22 ? ((getCachedOperationResult(cache22) as Envelope | null) ?? null) : null;
  const visibleOut21 = out21 ?? cachedOut21;
  const visibleOut22 = out22 ?? cachedOut22;

  const refreshTemplates = useCallback(async () => {
    try {
      const list = await listTemplates();
      list.sort((a, b) => b.savedAt - a.savedAt);
      setTemplateRows(list);
      setSavedTemplateId((cur) => (cur && list.some((t) => t.id === cur) ? cur : ""));
    } catch {
      setTemplateRows([]);
    }
  }, []);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  const run21 = async () => {
    if (!fisa21 || !plan21) {
      setError("Upload both the course sheet (fisa) and the curriculum plan (plan).");
      return;
    }
    setLoading("21");
    setError(null);
    setOut21(null);
    try {
      const data = new FormData();
      data.append("fisa", fisa21);
      data.append("plan", plan21);
      const res = await postFormData<Envelope>("/uc2/sync-master", data);
      setOut21(res);
      const a = await sha256Hex(fisa21);
      const b = await sha256Hex(plan21);
      setCachedOperationResult(cacheKeySyncMaster(a, b), res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(null);
    }
  };

  const run22 = async () => {
    if (!fisa22 || !plan22) {
      setError("Upload both documents for competency mapping.");
      return;
    }
    setLoading("22");
    setError(null);
    setOut22(null);
    try {
      const data = new FormData();
      data.append("fisa", fisa22);
      data.append("plan", plan22);
      const res = await postFormData<Envelope>("/uc2/competency-mapper", data);
      setOut22(res);
      const a = await sha256Hex(fisa22);
      const b = await sha256Hex(plan22);
      setCachedOperationResult(cacheKeyCompetencyMapper(a, b), res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(null);
    }
  };

  const run4 = async () => {
    if (!plan4 || !subject4.trim()) {
      setError("Upload the plan PDF and enter the exact course name to look up.");
      return;
    }
    if (templateSource === "disk" && !template4) {
      setError("Choose a Word template file, or switch template source to server default / saved.");
      return;
    }
    if (templateSource === "saved" && !savedTemplateId) {
      setError("Pick a saved template from the list, or change template source.");
      return;
    }
    setLoading("4");
    setError(null);
    setBootstrapMsg(null);
    try {
      const data = new FormData();
      data.append("plan", plan4);
      data.append("subject", subject4.trim());

      let templateFile: File | null = null;
      if (templateSource === "disk" && template4) {
        templateFile = template4;
      } else if (templateSource === "saved" && savedTemplateId) {
        const rec = await getTemplate(savedTemplateId);
        if (!rec) {
          setError("Saved template was removed. Refresh the list or pick another.");
          setLoading(null);
          return;
        }
        templateFile = templateRecordToFile(rec);
      }
      if (templateFile) {
        data.append("template", templateFile);
      }

      const name = await downloadBlobFromFormData(
        "/uc4/bootstrap-draft",
        data,
        "bootstrap_draft.docx"
      );
      setBootstrapMsg(`Download started: ${name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan alignment</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cross-document checks between a course sheet and the official study plan, plus a Word
          draft bootstrap from the plan. 
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync master</CardTitle>
          <CardDescription>
            Compare title, ECTS, and evaluation type between the course sheet and the study plan 

          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OperationCacheBanner cacheKey={cache21} onApply={(p) => setOut21(p as Envelope)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SavedFilePicker
              label="Course sheet (Fișa)"
              inputId="fisa-21"
              accept=".pdf,.docx,.txt,.md"
              file={fisa21}
              onChange={(next) => {
                setFisa21(next);
                setOut21(null);
              }}
            />
            <SavedFilePicker
              label="Study plan (Plan)"
              inputId="plan-21"
              accept=".pdf,.docx,.txt,.md"
              file={plan21}
              onChange={(next) => {
                setPlan21(next);
                setOut21(null);
              }}
            />
          </div>
          <Button type="button" onClick={run21} disabled={loading !== null}>
            {loading === "21" ? "Running…" : "Run sync master"}
          </Button>
          {visibleOut21 ? <StructuredResultView value={visibleOut21} title="Sync master results" /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competency mapper</CardTitle>
          <CardDescription>
            Map CP/CT lines from the course sheet against the official study plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OperationCacheBanner cacheKey={cache22} onApply={(p) => setOut22(p as Envelope)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SavedFilePicker
              label="Course sheet"
              inputId="fisa-22"
              accept=".pdf,.docx,.txt,.md"
              file={fisa22}
              onChange={(next) => {
                setFisa22(next);
                setOut22(null);
              }}
            />
            <SavedFilePicker
              label="Study plan"
              inputId="plan-22"
              accept=".pdf,.docx,.txt,.md"
              file={plan22}
              onChange={(next) => {
                setPlan22(next);
                setOut22(null);
              }}
            />
          </div>
          <Button type="button" onClick={run22} disabled={loading !== null}>
            {loading === "22" ? "Running…" : "Run competency mapper"}
          </Button>
          {visibleOut22 ? <StructuredResultView value={visibleOut22} title="Competency mapper results" /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bootstrap Word draft</CardTitle>
          <CardDescription>
            Extract one course row from the plan PDF and render a Word template (
            form upload). Choose the server default,
            upload a .docx, or pick a template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subj">Course name (as in the plan table)</Label>
            <Input
              id="subj"
              value={subject4}
              onChange={(e) => setSubject4(e.target.value)}
              placeholder="e.g. Fundamentele programării"
            />
          </div>
          <SavedFilePicker
            label="Plan PDF"
            inputId="plan-4"
            accept=".pdf,application/pdf"
            file={plan4}
            onChange={setPlan4}
          />

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Word template</span>
            <div className="flex flex gap-2 text-sm ">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="tpl-src"
                  className="size-4 accent-primary"
                  checked={templateSource === "disk"}
                  onChange={() => setTemplateSource("disk")}
                />
                Upload a .docx from this computer
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="tpl-src"
                  className="size-4 accent-primary"
                  checked={templateSource === "saved"}
                  onChange={() => setTemplateSource("saved")}
                />
                Use a template saved in this browser
              </label>
            </div>
          </div>

          {templateSource === "disk" ? (
            <div className="space-y-2">
              <Label htmlFor="tpl-up">Word template (.docx)</Label>
              <Input
                id="tpl-up"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setTemplate4(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : null}

          {templateSource === "saved" ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="tpl-saved">Saved template</Label>
                <select
                  id="tpl-saved"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={savedTemplateId}
                  onChange={(e) => setSavedTemplateId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {templateRows.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void refreshTemplates()}>
                Refresh templates
              </Button>
            </div>
          ) : null}

          <Button type="button" onClick={run4} disabled={loading !== null}>
            {loading === "4" ? "Generating…" : "Download draft"}
          </Button>
          {bootstrapMsg ? (
            <p className="text-sm text-muted-foreground" role="status">
              {bootstrapMsg}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PlanToolsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading page…</p>}>
      <PlanToolsPageContent />
    </Suspense>
  );
}
