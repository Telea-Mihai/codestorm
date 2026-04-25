type Props = {
  changes: any[];
};

export default function DiffStats({ changes }: Props) {
  const added = changes.filter(c => c.type === "added").length;
  const modified = changes.filter(c => c.type === "modified").length;
  const removed = changes.filter(c => c.type === "removed").length;

  return (
    <div className="grid grid-cols-3 gap-2.5 shrink-0">
      <Stat color="green" label="Câmpuri adăugate" value={added} />
      <Stat color="amber" label="Secțiuni modificate" value={modified} />
      <Stat color="red" label="Secțiuni eliminate" value={removed} />
    </div>
  );
}

function Stat({ color, label, value }: any) {
  return (
    <div className={`bg-${color}-100 border border-${color}-400 rounded-lg px-4 py-3`}>
      <p className={`text-[12px] text-${color}-700 mb-1`}>{label}</p>
      <p className={`text-[22px] font-medium text-${color}-800`}>{value}</p>
    </div>
  );
}