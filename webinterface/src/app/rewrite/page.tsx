"use client";

import { useState } from "react";

import { postJson } from "@/lib/backend";
import { StructuredResultView } from "@/components/structured-result-view";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CopilotEnvelope = {
  success?: boolean;
  result?: {
    draft?: string;
    applied_rules?: string[];
    instruction?: string;
  };
};

export default function RewritePage() {
  const [currentText, setCurrentText] = useState(
    "Capitolul prezinta fundamentele disciplinei si legaturile cu practica."
  );
  const [instruction, setInstruction] = useState(
    "Reformuleaza clar si mentioneaza aplicatii cu inteligenta artificiala."
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<CopilotEnvelope | null>(null);

  const handleGenerateDraft = async () => {
    setLoading(true);
    setError(null);
    setPayload(null);
    try {
      const res = await postJson<CopilotEnvelope>("/uc3/academic-copilot", {
        current_text: currentText,
        instruction,
      });
      setPayload(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const draft = payload?.result?.draft;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Draft writing helper</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sends your paragraph plus a plain-language instruction to the backend rewrite helper.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source text and instruction</CardTitle>
          <CardDescription>Both fields are required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="src">Paragraph to start from</Label>
            <Textarea
              id="src"
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instr">What you want changed</Label>
            <Textarea
              id="instr"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
            />
          </div>
          <Button type="button" onClick={handleGenerateDraft} disabled={loading}>
            {loading ? "Generating…" : "Generate revised draft"}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      {draft ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft output</CardTitle>
            {payload?.result?.applied_rules?.length ? (
              <CardDescription>
                Rules touched: {payload.result.applied_rules.join(", ")}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
              {draft}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {payload && !draft ? <StructuredResultView value={payload} title="Response" /> : null}
    </div>
  );
}
