"use client";

import dynamic from "next/dynamic";

const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then(m => m.DiffEditor),
  { ssr: false }
);

type Props = {
  original: string;
  modified: string;
  mode: "side-by-side" | "inline";
};

export default function DiffEditorView({ original, modified, mode }: Props) {
  return (
    <div className="flex-1 min-w-0 rounded-xl border overflow-hidden">
      <DiffEditor
        height="100%"
        language="plaintext"
        original={original}
        modified={modified}
        theme="vs-dark"
        options={{
          renderSideBySide: mode === "side-by-side",
          useInlineViewWhenSpaceIsLimited: mode === "inline",
          readOnly: true,
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: "on",
        }}
      />
    </div>
  );
}