type Props = {
  renderSide: "side-by-side" | "inline";
  onChange: (mode: "side-by-side" | "inline") => void;
};

export default function DiffHeader({ renderSide, onChange }: Props) {
  return (
    <div className="flex items-start justify-between shrink-0">
      <div>
        <h1 className="text-[18px] font-medium">Syllabus Diff</h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          <span className="mr-3">🔴 Fișa 2023/2024</span>
          <span className="mr-3">vs</span>
          <span>🟢 Fișa 2024/2025</span>
        </p>
      </div>

      <div className="flex rounded-xl border overflow-hidden">
        <button
          onClick={() => onChange("side-by-side")}
          className={renderSide === "side-by-side" ? "bg-zinc-200 px-4 py-2" : "px-4 py-2"}
        >
          Side by side
        </button>
        <button
          onClick={() => onChange("inline")}
          className={renderSide === "inline" ? "bg-zinc-200 px-4 py-2" : "px-4 py-2"}
        >
          Inline
        </button>
      </div>
    </div>
  );
}