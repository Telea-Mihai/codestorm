type Props = {
  renderSide: "side-by-side" | "inline";
  onChange: (mode: "side-by-side" | "inline") => void;
};

export default function DiffHeader({ renderSide, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border-slate-200 bg-[var(--primary)] px-4 py-3 text-slate-900 shrink-0">
      <h1 className="text-lg font-semibold text-slate-900">Diff View</h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange("side-by-side")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            renderSide === "side-by-side" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Side by side
        </button>
        <button
          type="button"
          onClick={() => onChange("inline")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            renderSide === "inline" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Inline
        </button>
      </div>
    </div>
  );
}