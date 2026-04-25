"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EvaluationRow = { label: string; weight: number };

type Props = {
  rows: EvaluationRow[];
  onChange: (rows: EvaluationRow[]) => void;
};

export function evaluationRowsToPayload(rows: EvaluationRow[]): { label: string; weight: number }[] {
  return rows
    .map((r) => ({
      label: r.label.trim(),
      weight: Number.isFinite(r.weight) ? r.weight : 0,
    }))
    .filter((r) => r.label.length > 0);
}

export function EvaluationItemsEditor({ rows, onChange }: Props) {
  const update = (index: number, patch: Partial<EvaluationRow>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    onChange([...rows, { label: "", weight: 0 }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      onChange([{ label: "", weight: 0 }]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  const running = rows.reduce((acc, r) => acc + (Number.isFinite(r.weight) ? r.weight : 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-foreground">Evaluation components</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Running total: {running}%</span>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRow}>
            <Plus className="size-3.5" aria-hidden />
            Add row
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter each graded component and its percentage. The backend checks that weights add up and respect exam rules.
      </p>
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li
            key={i}
            className="flex flex-col gap-2 rounded-md border border-border bg-muted/10 p-3 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground" htmlFor={`lbl-${i}`}>
                Label
              </Label>
              <Input
                id={`lbl-${i}`}
                value={row.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="e.g. Final exam"
              />
            </div>
            <div className="w-full space-y-1 sm:w-28">
              <Label className="text-xs text-muted-foreground" htmlFor={`w-${i}`}>
                Weight %
              </Label>
              <Input
                id={`w-${i}`}
                type="number"
                min={0}
                max={100}
                step={1}
                value={Number.isFinite(row.weight) ? row.weight : ""}
                onChange={(e) => update(i, { weight: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex justify-end sm:pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(i)}
                aria-label={`Remove row ${i + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
