"use client";

import { useState } from "react";

import {
  EvaluationItemsEditor,
  evaluationRowsToPayload,
  type EvaluationRow,
} from "@/components/evaluation-items-editor";
import { StructuredResultView } from "@/components/structured-result-view";
import { postFormData } from "@/lib/backend";
import { SavedFilePicker } from "@/components/saved-file-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialRows: EvaluationRow[] = [
  { label: "Examen final", weight: 50 },
  { label: "Proiect", weight: 30 },
  { label: "Activitate curs", weight: 20 },
];

type ValidatorEnvelope = {
  success?: boolean;
  result?: {
    input_items?: { label: string; weight: number }[];
    total?: number;
    is_valid?: boolean;
    violations?: { rule: string; message: string }[];
    suggested_distribution?: { label: string; weight: number }[];
    suggested_total?: number;
  };
};

export default function WeightsPage() {
  const [rows, setRows] = useState<EvaluationRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ValidatorEnvelope | null>(null);
  const [planFile, setPlanFile] = useState<File | null>(null);

  const handleValidateGradingTable = async () => {
    const items = evaluationRowsToPayload(rows);
    if (items.length === 0) {
      setError("Add at least one component with a label.");
      return;
    }
    if (!planFile) {
      setError("Please select a Curriculum Plan document.");
      return;
    }
    setLoading(true);
    setError(null);
    setPayload(null);
    try {
      const fd = new FormData();
      fd.append("plan", planFile);
      fd.append("evaluation_items", JSON.stringify(items));

      const res = await postFormData<ValidatorEnvelope>("/uc3/auto-correct-validator", fd);
      setPayload(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed.");
    } finally {
      setLoading(false);
    }
  };

  const r = payload?.result;

  return (
    <div className="mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Grading weights checker</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add each graded component and its percentage. The service checks totals and exam caps, then
          suggests a corrected split — no JSON required.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evaluation breakdown</CardTitle>
          <CardDescription>Adjust labels and weights to mirror your syllabus table.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SavedFilePicker
            label="Curriculum Plan Document (.pdf, .docx)"
            inputId="plan-upload"
            accept=".pdf,.docx"
            file={planFile}
            onChange={(file) => {
              setPlanFile(file);
              setError(null);
            }}
          />
          <EvaluationItemsEditor rows={rows} onChange={setRows} />
          <Button type="button" onClick={handleValidateGradingTable} disabled={loading}>
            {loading ? "Checking…" : "Validate weights and show suggested split"}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {r ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rule status</CardTitle>
              <CardDescription>
                {r.is_valid ? "No blocking issues reported." : "Issues need a correction pass."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Current total: <span className="font-semibold text-foreground">{r.total}%</span>
              </p>
              {r.violations?.length ? (
                <ul className="list-inside list-disc text-sm text-destructive">
                  {r.violations.map((v, i) => (
                    <li key={i}>{v.message}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suggested distribution</CardTitle>
              <CardDescription>
                Total after adjustment: {r.suggested_total ?? "—"}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              {r.suggested_distribution?.length ? (
                <ul className="space-y-1 text-sm">
                  {r.suggested_distribution.map((row, i) => (
                    <li key={i} className="flex justify-between border-b border-border py-1">
                      <span>{row.label}</span>
                      <span className="font-mono">{row.weight}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <StructuredResultView value={r} />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {payload && !r ? <StructuredResultView value={payload} title="Response" /> : null}
    </div>
  );
}
