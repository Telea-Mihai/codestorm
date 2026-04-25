type Props = {
  changes: Array<{ type: "added" | "removed" | "modified" }>;
};

export default function DiffStats({ changes }: Props) {
  const added = changes.filter((c) => c.type === "added").length;
  const modified = changes.filter((c) => c.type === "modified").length;
  const removed = changes.filter((c) => c.type === "removed").length;

  return (
    <div className="grid grid-cols-1 gap-2.5 shrink-0 md:grid-cols-3">
      <Stat tone="green" label="Added Blocks" value={added} />
      <Stat tone="amber" label="Modified Blocks" value={modified} />
      <Stat tone="red" label="Removed Blocks" value={removed} />
    </div>
  );
}

function Stat({
  tone,
  label,
  value,
}: {
  tone: "green" | "amber" | "red";
  label: string;
  value: number;
}) {
  const toneClasses = {
    green: {
      container: "bg-emerald-50 border-emerald-200",
      label: "text-emerald-700",
      value: "text-emerald-800",
    },
    amber: {
      container: "bg-amber-50 border-amber-200",
      label: "text-amber-700",
      value: "text-amber-800",
    },
    red: {
      container: "bg-rose-50 border-rose-200",
      label: "text-rose-700",
      value: "text-rose-800",
    },
  }[tone];

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClasses.container}`}>
      <p className={`mb-1 text-[12px] ${toneClasses.label}`}>{label}</p>
      <p className={`text-[22px] font-medium ${toneClasses.value}`}>{value}</p>
    </div>
  );
}