"use client";

import type { ReactNode } from "react";

import { JsonBlock } from "@/components/json-block";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function IntegrityView({ data }: { data: { missing_sections: string[]; missing_values: string[] } }) {
  const sectionsOk = data.missing_sections.length === 0;
  const valuesOk = data.missing_values.length === 0;
  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          sectionsOk && valuesOk
            ? "border-emerald-600/50 bg-emerald-950/30 text-emerald-100"
            : "border-amber-600/50 bg-amber-950/25 text-amber-100"
        }`}
      >
        {sectionsOk && valuesOk
          ? "No missing sections or empty placeholders were reported."
          : "The model flagged gaps or placeholders — review the lists below."}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Missing sections</h3>
          {data.missing_sections.length ? (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {data.missing_sections.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">None reported.</p>
          )}
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Empty or placeholder values</h3>
          {data.missing_values.length ? (
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {data.missing_values.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">None reported.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MathConsistencyView({
  data,
  alerts,
}: {
  data: {
    total_hours?: number;
    evaluation_weights?: { nume_evaluare?: string; procentaj?: number }[];
    is_evaluation_sum_100?: boolean;
  };
  alerts?: unknown;
}) {
  const weights = data.evaluation_weights ?? [];
  const alertList = Array.isArray(alerts) ? (alerts as string[]) : [];
  const sum = weights.reduce((acc, w) => acc + (typeof w.procentaj === "number" ? w.procentaj : 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-muted/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">Total hours (extracted)</p>
          <p className="text-lg font-semibold text-foreground">{data.total_hours ?? "—"}</p>
        </div>
        <div className="rounded-md border border-border bg-muted/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">Model says sum is 100%</p>
          <p className="text-lg font-semibold text-foreground">
            {data.is_evaluation_sum_100 === true ? "Yes" : data.is_evaluation_sum_100 === false ? "No" : "—"}
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">Recalculated total</p>
          <p className="text-lg font-semibold text-foreground">{Number.isFinite(sum) ? `${sum}%` : "—"}</p>
        </div>
      </div>
      <div className="rounded-md border border-border bg-card">
        <h3 className="border-b border-border px-4 py-2 text-sm font-semibold text-foreground">
          Evaluation weights
        </h3>
        <div className="divide-y divide-border">
          {weights.length ? (
            weights.map((row, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-4 py-2 text-sm">
                <span className="text-foreground">{row.nume_evaluare ?? "—"}</span>
                <span className="font-mono text-muted-foreground">{row.procentaj ?? "—"}%</span>
              </div>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">No rows returned.</p>
          )}
        </div>
      </div>
      {alertList.length ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-destructive">Alerts</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-destructive/90">
            {alertList.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AuditView({ data }: { data: Record<string, unknown> }) {
  const generic = (data.generic_sections as { line?: number; text?: string; reason?: string }[]) ?? [];
  const bib = data.bibliography as Record<string, unknown> | undefined;
  const ext = data.external_links as { total?: number; checks?: { url?: string; format_valid?: boolean }[] } | undefined;
  const suggestions = (data.suggestions as string[]) ?? [];

  return (
    <div className="space-y-4">
      {suggestions.length ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Suggestions</h3>
          <ul className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-md border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Possibly generic headings</h3>
        {generic.length ? (
          <ul className="mt-2 space-y-2 text-sm">
            {generic.map((g, i) => (
              <li key={i} className="rounded border border-border bg-muted/20 px-3 py-2">
                <span className="text-xs text-muted-foreground">Line {g.line ?? "?"}</span>
                <p className="text-foreground">{g.text}</p>
                {g.reason ? <p className="mt-1 text-xs text-muted-foreground">{g.reason}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">None flagged.</p>
        )}
      </div>
      {bib ? (
        <div className="rounded-md border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Bibliography</h3>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Lines mentioning bibliography</dt>
              <dd className="font-medium text-foreground">{String(bib.detected_entries ?? "—")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Years found</dt>
              <dd className="font-medium text-foreground">
                {Array.isArray(bib.years_found) ? (bib.years_found as number[]).join(", ") || "—" : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Recent threshold</dt>
              <dd className="font-medium text-foreground">{String(bib.requires_recent_year ?? "—")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Has recent source</dt>
              <dd className="font-medium text-foreground">{bib.has_recent_source === true ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </div>
      ) : null}
      {ext?.checks?.length ? (
        <div className="rounded-md border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">
            External links ({ext.total ?? ext.checks.length})
          </h3>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-sm">
            {ext.checks.map((c, i) => (
              <li
                key={i}
                className={`truncate rounded px-2 py-1 font-mono text-xs ${
                  c.format_valid ? "bg-muted/30 text-muted-foreground" : "bg-destructive/15 text-destructive"
                }`}
                title={c.url}
              >
                {c.format_valid ? "✓" : "✗"} {c.url}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SmartUpdaterView({ data }: { data: Record<string, unknown> }) {
  const mode = String(data.mode ?? "");
  const docs = (data.documents as Record<string, unknown>[]) ?? [];
  const generated = (data.generated_files as string[]) ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Mode: <span className="font-medium text-foreground">{mode || "—"}</span>
      </p>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Document</th>
              <th className="px-3 py-2 font-medium">Changed</th>
              <th className="px-3 py-2 font-medium">Rules applied</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d, i) => {
              const rules = (d.applied_rules as { find?: string; occurrences?: number }[]) ?? [];
              return (
                <tr key={i} className="border-t border-border align-top">
                  <td className="px-3 py-2 text-foreground">{String(d.document ?? "")}</td>
                  <td className="px-3 py-2">{d.changed ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {rules.length
                      ? rules.map((r, j) => (
                          <span key={j} className="block">
                            “{r.find}” × {r.occurrences ?? 0}
                          </span>
                        ))
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {generated.length ? (
        <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Exported files (server paths)</p>
          <ul className="mt-1 list-inside list-disc font-mono text-xs text-muted-foreground">
            {generated.map((p, i) => (
              <li key={i} className="truncate" title={p}>
                {p}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SyncMasterView({ data }: { data: Record<string, unknown> }) {
  const rows =
    (data.lista_comparatii as {
      nume_camp?: string;
      valoare_in_fisa?: string;
      valoare_in_plan?: string;
      este_potrivire_exacta?: boolean;
      descriere_conflict?: string;
    }[]) ?? [];
  const critical = data.are_conflicte_critice === true;

  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          critical ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-emerald-600/40 bg-emerald-950/20 text-emerald-100"
        }`}
      >
        {critical ? "Critical conflicts were reported." : "No critical conflicts flagged."}
        {data.numele_materiei_analizate ? (
          <p className="mt-1 text-foreground/90">Course: {String(data.numele_materiei_analizate)}</p>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Field</th>
              <th className="px-3 py-2 font-medium">Course sheet</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Match</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium text-foreground">{row.nume_camp}</td>
                <td className="px-3 py-2 whitespace-pre-wrap text-muted-foreground">{row.valoare_in_fisa}</td>
                <td className="px-3 py-2 whitespace-pre-wrap text-muted-foreground">{row.valoare_in_plan}</td>
                <td className="px-3 py-2">
                  {row.este_potrivire_exacta ? (
                    <span className="text-emerald-400">Yes</span>
                  ) : (
                    <span className="text-destructive">No</span>
                  )}
                  {row.descriere_conflict ? (
                    <p className="mt-1 text-xs text-muted-foreground">{row.descriere_conflict}</p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompetencyMapperView({ data }: { data: Record<string, unknown> }) {
  const cp = (data.analiza_competente_profesionale as Record<string, unknown>[]) ?? [];
  const ct = (data.analiza_competente_transversale as Record<string, unknown>[]) ?? [];
  const conclusion = data.concluzie_generala;

  const block = (title: string, rows: Record<string, unknown>[]) => (
    <div className="rounded-md border border-border bg-card">
      <h3 className="border-b border-border px-4 py-2 text-sm font-semibold text-foreground">{title}</h3>
      <ul className="divide-y divide-border">
        {rows.length ? (
          rows.map((row, i) => (
            <li key={i} className="space-y-1 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">{String(row.cod_sau_descriere ?? "")}</p>
              <p className="text-xs text-muted-foreground">
                Plan match: {row.scrisa_corect_conform_planului === true ? "yes" : "no"} · Fits objectives:{" "}
                {row.se_potriveste_cu_obiectivele === true ? "yes" : "no"}
              </p>
              {row.recomandare_AI ? (
                <p className="text-sm text-muted-foreground">{String(row.recomandare_AI)}</p>
              ) : null}
            </li>
          ))
        ) : (
          <li className="px-4 py-3 text-sm text-muted-foreground">No rows.</li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="space-y-4">
      {conclusion ? (
        <p className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-foreground">{String(conclusion)}</p>
      ) : null}
      {block("Professional competencies (CP)", cp)}
      {block("Transversal competencies (CT)", ct)}
    </div>
  );
}

function GenericValue({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span className="break-words text-foreground">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">Empty list</span>;
    }
    const allPrimitive = value.every(
      (v) => v === null || ["string", "number", "boolean"].includes(typeof v)
    );
    if (allPrimitive && depth > 0) {
      return (
        <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
          {value.map((v, i) => (
            <li key={i}>{String(v)}</li>
          ))}
        </ul>
      );
    }
    return (
      <ul className="space-y-2">
        {value.map((v, i) => (
          <li key={i} className="rounded border border-border bg-muted/15 px-3 py-2">
            <GenericValue value={v} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span className="text-muted-foreground">Empty object</span>;
    }
    return (
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {entries.map(([k, v]) => (
          <div key={k} className="rounded border border-border bg-card/50 px-3 py-2 sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</dt>
            <dd className="mt-1">
              <GenericValue value={v} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <JsonBlock value={value} />;
}

function trySpecialBody(body: unknown, alerts?: unknown): ReactNode | null {
  if (!isPlainObject(body)) {
    return null;
  }
  const o = body;
  if (Array.isArray(o.missing_sections) && Array.isArray(o.missing_values)) {
    return <IntegrityView data={o as { missing_sections: string[]; missing_values: string[] }} />;
  }
  if ("total_hours" in o && Array.isArray(o.evaluation_weights)) {
    return <MathConsistencyView data={o} alerts={alerts} />;
  }
  if ("generic_sections" in o && "bibliography" in o) {
    return <AuditView data={o} />;
  }
  if (
    Array.isArray(o.documents) &&
    o.documents.length > 0 &&
    o.documents.every((d) => isPlainObject(d) && "document" in d)
  ) {
    return <SmartUpdaterView data={o} />;
  }
  if (Array.isArray(o.lista_comparatii) && "are_conflicte_critice" in o) {
    return <SyncMasterView data={o} />;
  }
  if (Array.isArray(o.analiza_competente_profesionale) || Array.isArray(o.analiza_competente_transversale)) {
    return <CompetencyMapperView data={o} />;
  }
  return null;
}

function unwrapEnvelope(value: unknown): {
  body: unknown;
  alerts?: unknown;
  meta: { success?: boolean; error?: string; task?: string; input?: unknown };
} {
  if (!isPlainObject(value)) {
    return { body: value, meta: {} };
  }
  const v = value;
  if ("result" in v) {
    return {
      body: v.result,
      alerts: "alerts" in v ? v.alerts : undefined,
      meta: {
        success: typeof v.success === "boolean" ? v.success : undefined,
        error: typeof v.error === "string" ? v.error : undefined,
        input: "input" in v ? v.input : undefined,
      },
    };
  }
  return {
    body: value,
    meta: {
      success: typeof v.success === "boolean" ? v.success : undefined,
      error: typeof v.error === "string" ? v.error : undefined,
    },
  };
}

type Props = {
  value: unknown;
  title?: string;
};

export function StructuredResultView({ value, title }: Props) {
  const { body, alerts, meta } = unwrapEnvelope(value);
  const special = trySpecialBody(body, alerts);
  const fallback = special ?? <GenericValue value={body} depth={0} />;

  return (
    <div className="space-y-3">
      {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
      {meta.task ? (
        <p className="text-xs text-muted-foreground">
          Task: <span className="text-foreground">{meta.task}</span>
        </p>
      ) : null}
      {meta.success === false && meta.error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {meta.error}
        </div>
      ) : null}
      {meta.input != null && isPlainObject(meta.input) && Object.keys(meta.input).length ? (
        <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Input</span>{" "}
          {Object.entries(meta.input as Record<string, unknown>)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(" · ")}
        </div>
      ) : null}
      <div className="rounded-lg border border-border bg-card/40 p-4">{fallback}</div>
      {alerts != null && !Array.isArray(alerts) ? (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Extra</p>
          <GenericValue value={alerts} depth={0} />
        </div>
      ) : null}
      <details className="group text-sm">
        <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
          View raw JSON
        </summary>
        <div className="mt-2">
          <JsonBlock value={value} />
        </div>
      </details>
    </div>
  );
}
