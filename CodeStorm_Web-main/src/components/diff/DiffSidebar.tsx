type Props = {
  changes: any[];
};

export default function DiffSidebar({ changes }: Props) {
  return (
    <div className="w-[260px] flex flex-col rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <p className="text-[13px] font-medium">Sumar modificări</p>
        <p className="text-[12px] text-zinc-400">
          {changes.length} diferențe detectate
        </p>
      </div>

      <div className="overflow-y-auto flex-1">
        {changes.map((c, i) => (
          <div key={i} className="flex gap-3 px-4 py-3 border-b">
            <span className={`w-2 h-2 rounded-full mt-1 ${
              c.type === "added" ? "bg-green-600" :
              c.type === "removed" ? "bg-red-600" : "bg-amber-500"
            }`} />

            <div className="min-w-0">
              <p className="text-[12px]">{c.label}</p>
              <p className="text-[11px] text-zinc-400">{c.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}