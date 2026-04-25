"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ReplacementRow = { find: string; replace: string };

type Props = {
  rows: ReplacementRow[];
  onChange: (rows: ReplacementRow[]) => void;
};

export function replacementRowsToJson(rows: ReplacementRow[]): string {
  const cleaned = rows
    .map((r) => ({ find: r.find.trim(), replace: r.replace }))
    .filter((r) => r.find.length > 0);
  return JSON.stringify(cleaned);
}

export function ReplacementRulesEditor({ rows, onChange }: Props) {
  const update = (index: number, patch: Partial<ReplacementRow>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    onChange([...rows, { find: "", replace: "" }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      onChange([{ find: "", replace: "" }]);
      return;
    }
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-foreground">Find and replace rules</Label>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRow}>
          <Plus className="size-3.5" aria-hidden />
          Add rule
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Each rule replaces every occurrence of the exact text in the find field. Rules run in order.
      </p>
      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li
            key={i}
            className="grid gap-2 rounded-md border border-border bg-muted/10 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground" htmlFor={`find-${i}`}>
                Find
              </Label>
              <Input
                id={`find-${i}`}
                value={row.find}
                onChange={(e) => update(i, { find: e.target.value })}
                placeholder="Text to search for"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground" htmlFor={`rep-${i}`}>
                Replace with
              </Label>
              <Input
                id={`rep-${i}`}
                value={row.replace}
                onChange={(e) => update(i, { replace: e.target.value })}
                placeholder="Replacement text"
              />
            </div>
            <div className="flex justify-end sm:pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(i)}
                aria-label={`Remove rule ${i + 1}`}
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
