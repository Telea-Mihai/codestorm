"use client";

import { Suspense, useState } from "react";

import { SavedFilePicker } from "@/components/saved-file-picker";
import { useLibraryFileForConvert } from "@/hooks/use-library-file-from-url";
import { downloadBlobFromFormData } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ConvertPageContent() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"pdf-docx" | "docx-pdf" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useLibraryFileForConvert(setPdfFile, setDocxFile, "lib");

  const runDownload = async (
    which: "pdf-docx" | "docx-pdf",
    file: File | null,
    route: string,
    fallbackName: string
  ) => {
    if (!file) {
      setError(which === "pdf-docx" ? "Choose a PDF file first." : "Choose a Word file first.");
      return;
    }
    setBusy(which);
    setError(null);
    setMessage(null);
    try {
      const data = new FormData();
      data.append("file", file);
      const name = await downloadBlobFromFormData(route, data, fallbackName);
      setMessage(`Download started: ${name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Convert PDF or Word</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Each action downloads the converted file. PDF must end in <span className="font-mono">.pdf</span>
          ; Word must end in <span className="font-mono">.docx</span>. From{" "}
          <a className="text-primary underline-offset-2 hover:underline" href="/dashboard">
            Documents
          </a>,{" "}
          <span className="font-mono text-xs">?lib=</span> picks the correct slot from the file extension.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PDF → Word</CardTitle>
          <CardDescription>Upload a PDF and receive an editable Word document.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SavedFilePicker
            label="PDF file"
            inputId="pdf-in"
            accept=".pdf,application/pdf"
            file={pdfFile}
            onChange={setPdfFile}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null}
            onClick={() =>
              runDownload("pdf-docx", pdfFile, "/convert/pdf-to-docx", "converted.docx")
            }
          >
            {busy === "pdf-docx" ? "Converting…" : "Download as Word (.docx)"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Word → PDF</CardTitle>
          <CardDescription>Upload a Word file and receive a PDF copy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SavedFilePicker
            label="Word file"
            inputId="docx-in"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            file={docxFile}
            onChange={setDocxFile}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy !== null}
            onClick={() =>
              runDownload("docx-pdf", docxFile, "/convert/docx-to-pdf", "converted.pdf")
            }
          >
            {busy === "docx-pdf" ? "Converting…" : "Download as PDF"}
          </Button>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-foreground">{message}</p> : null}
    </div>
  );
}

export default function ConvertPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading page…</p>}>
      <ConvertPageContent />
    </Suspense>
  );
}
