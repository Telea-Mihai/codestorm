"use client";

import { useState } from "react";
import DiffEditorView from "@/src/components/diff/DiffEditorView";
import DiffSidebar from "@/src/components/diff/DiffSidebar";
import DiffStats from "@/src/components/diff/DiffStats";

import { OLD_SYLLABUS, NEW_SYLLABUS } from "@/src/components/data/syllabus";
import { CHANGES } from "@/src/components/data/changes";

function DiffHeader({
  renderSide,
  onChange,
}: {
  renderSide: "side-by-side" | "inline";
  onChange: (mode: "side-by-side" | "inline") => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <h1 className="text-lg font-semibold text-slate-900">Diff View</h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange("side-by-side")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            renderSide === "side-by-side"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          Side by side
        </button>
        <button
          type="button"
          onClick={() => onChange("inline")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            renderSide === "inline"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          Inline
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const [mode, setMode] = useState<"side-by-side" | "inline">("side-by-side");

  return (
    <div className="flex flex-col gap-5 p-6 h-screen overflow-hidden">
      <DiffHeader renderSide={mode} onChange={setMode} />
      <DiffStats changes={CHANGES} />

      <div className="flex gap-4 flex-1 min-h-0">
        <DiffEditorView
          original={OLD_SYLLABUS}
          modified={NEW_SYLLABUS}
          mode={mode}
        />
        <DiffSidebar changes={CHANGES} />
      </div>
    </div>
  );
}