export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[480px] overflow-auto rounded-md border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
