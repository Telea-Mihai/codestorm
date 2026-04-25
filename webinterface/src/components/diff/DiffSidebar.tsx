type Props = {
  changes: Array<{
    type: "added" | "removed" | "modified";
    label: string;
    detail: string;
  }>;
};

export default function DiffSidebar({ changes }: Props) {
  return (
    <div className="w-[260px] shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white text-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-[13px] font-medium">Change Summary</p>
        <p className="text-[12px] text-slate-500">
          {changes.length} differences detected
        </p>
      </div>

      <div className="overflow-y-auto flex-1">
        {changes.map((c, i) => (
          <div key={i} className="flex gap-3 px-4 py-3 border-b border-slate-100">
            <span className={`w-2 h-2 rounded-full mt-1 ${
              c.type === "added" ? "bg-green-600" :
              c.type === "removed" ? "bg-red-600" : "bg-amber-500"
            }`} />

            <div className="min-w-0">
              <p className="text-[12px] text-slate-900">{c.label}</p>
              <p className="text-[11px] text-slate-500">{c.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}