"use client";

import { useState } from "react";

type UC = "uc1" | "uc2";

const SEVERITY = {
  critic: "bg-red-50 text-red-700 border border-red-200",
  avertisment: "bg-amber-50 text-amber-700 border border-amber-200",
  valid: "bg-green-50 text-green-700 border border-green-200",
} as const;

const SEVERITY_LABEL = {
  critic: "missing section",
  avertisment: "missing value",
  valid: "valid",
} as const;

const DOT = {
  critic: "bg-red-500",
  avertisment: "bg-amber-400",
  valid: "bg-green-500",
} as const;

type Severity = keyof typeof SEVERITY;

interface ReportRow {
  file: string;
  issues: string;
  severity: Severity;
}

interface MathRow {
  label: string;
  value: number;
  expected: string;
  status: "ok" | "mic" | "eroare";
  max: number;
}

// FAKE DATAAAA
const reportRows: ReportRow[] = [
  { file: "Contract_Furnizor_A.docx", issues: "Clauza 4 · Secțiune GDPR · Anexa B", severity: "critic" },
  { file: "Fisa_Disciplina_BD.docx", issues: "Bibliografie · Secțiunea Obiective · Footer", severity: "critic" },
  { file: "Contract_Servicii_03.docx", issues: "Secțiune penalități · Clauza de confidențialitate", severity: "critic" },
  { file: "Fisa_Disciplina_ML.docx", issues: "Semnătură · Dată completare", severity: "avertisment" },
  { file: "Contract_Furnizor_B.docx", issues: "Număr înregistrare · Cod fiscal", severity: "avertisment" },
  { file: "Fisa_Disciplina_SO.docx", issues: "Toate câmpurile prezente", severity: "valid" },
];

const mathRows: MathRow[] = [
  { label: "Examen final", value: 50, expected: "așteptat ≤60%", status: "ok", max: 60 },
  { label: "Proiect", value: 30, expected: "așteptat ≤30%", status: "ok", max: 30 },
  { label: "Activitate curs", value: 15, expected: "așteptat ≥20%", status: "mic", max: 20 },
];

const mathTotal = mathRows.reduce((s, r) => s + r.value, 0);

const MATH_BADGE = {
  ok: "bg-green-50 text-green-700 border border-green-200",
  mic: "bg-amber-50 text-amber-700 border border-amber-200",
  eroare: "bg-red-50 text-red-700 border border-red-200",
};

const PROGRESS_COLOR = {
  ok: "bg-blue-500",
  mic: "bg-amber-400",
  eroare: "bg-red-500",
};

export default function IntegrityPage() {
  const [uc, setUC] = useState<UC>("uc1");

  return (
    <div className="p-6 flex flex-col gap-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-[18px] font-medium text-zinc-900 dark:text-zinc-100">
          Integrity
        </h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          Verificare automată a documentelor încărcate
        </p>
      </div>

      {/* Switcher */}
      <div className="flex w-fit rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <button
          onClick={() => setUC("uc1")}
          className={`px-5 py-2 text-[13px] border-r border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors ${
            uc === "uc1"
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
              : "bg-transparent text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          }`}
        >
          UC 1.1 — Integrity Guard
        </button>
        <button
          onClick={() => setUC("uc2")}
          className={`px-5 py-2 text-[13px] cursor-pointer transition-colors ${
            uc === "uc2"
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
              : "bg-transparent text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          }`}
        >
          UC 1.2 — Math Checker
        </button>
      </div>

      {/* Stats row */}
      {uc === "uc1" ? (
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Documente scanate", value: "12", color: "" },
            { label: "Missing sections", value: "3", color: "text-red-500" },
            { label: "Missing values", value: "5", color: "text-amber-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-50 dark:bg-zinc-900 rounded-lg px-4 py-3">
              <p className="text-[12px] text-zinc-400 mb-1">{label}</p>
              <p className={`text-[22px] font-medium ${color || "text-zinc-900 dark:text-zinc-100"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Documente scanate", value: "12", color: "" },
            { label: "Sume incorecte", value: "2", color: "text-red-500" },
            { label: "Total verificat", value: "10", color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-50 dark:bg-zinc-900 rounded-lg px-4 py-3">
              <p className="text-[12px] text-zinc-400 mb-1">{label}</p>
              <p className={`text-[22px] font-medium ${color || "text-zinc-900 dark:text-zinc-100"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* UC 1.1 Panel */}
      {uc === "uc1" && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                Raport câmpuri lipsă
              </p>
              <p className="text-[12px] text-zinc-400 mt-0.5">Missing values per document</p>
            </div>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
              3 missing sections
            </span>
          </div>

          <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Missing sections
            </span>
          </div>

          {reportRows
            .filter((r) => r.severity === "critic")
            .map((row) => (
              <ReportRowItem key={row.file} row={row} />
            ))}

          <div className="px-4 py-2 border-t border-b border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Missing values
            </span>
          </div>

          {reportRows
            .filter((r) => r.severity !== "critic")
            .map((row) => (
              <ReportRowItem key={row.file} row={row} />
            ))}
        </div>
      )}

      {/* UC 1.2 Panel */}
      {uc === "uc2" && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                Consistență numerică
              </p>
              <p className="text-[12px] text-zinc-400 mt-0.5">
                Verificare sume, ponderi și totaluri
              </p>
            </div>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
              2 erori
            </span>
          </div>

          {/* Alerts */}
          <div className="px-4 pt-3 pb-1 flex flex-col gap-2.5">
            <div className="flex gap-2.5 items-start p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertIcon color="#A32D2D" />
              <p className="text-[12px] text-red-800 leading-relaxed">
                <span className="font-medium">Fisa_Disciplina_BD.docx</span> — Suma ponderilor
                de evaluare este 95%, nu 100%. Lipsesc 5%.
              </p>
            </div>
            <div className="flex gap-2.5 items-start p-3 rounded-lg bg-amber-50 border border-amber-200">
              <WarningIcon color="#854F0B" />
              <p className="text-[12px] text-amber-900 leading-relaxed">
                <span className="font-medium">Factura_Furnizor_A.pdf</span> — Total declarat
                12.450 RON, suma pozițiilor: 11.980 RON. Diferență: 470 RON.
              </p>
            </div>
          </div>

          <div className="px-4 py-2 mt-1 border-t border-b border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Detaliu ponderi — Fisa_Disciplina_BD.docx
            </span>
          </div>

          {mathRows.map((row) => (
            <MathRowItem key={row.label} row={row} />
          ))}

          {/* Total row */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-zinc-300 dark:border-zinc-700">
            <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 flex-1">
              Total
            </span>
            <div className="w-20 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${mathTotal}%` }}
              />
            </div>
            <span className="text-[13px] font-medium text-red-500 w-12 text-right">
              {mathTotal}%
            </span>
            <span className="text-[12px] text-red-600 w-28 text-right">trebuie 100%</span>
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${MATH_BADGE.eroare}`}>
              eroare
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportRowItem({ row }: { row: ReportRow }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[row.severity]}`} />
      <span className="text-[13px] text-zinc-900 dark:text-zinc-100 flex-1">{row.file}</span>
      <span className="text-[12px] text-zinc-400">{row.issues}</span>
      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${SEVERITY[row.severity]}`}>
        {SEVERITY_LABEL[row.severity]}
      </span>
    </div>
  );
}

function MathRowItem({ row }: { row: MathRow }) {
  const fillPct = Math.min((row.value / row.max) * 100, 100);
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
      <span className="text-[13px] text-zinc-900 dark:text-zinc-100 flex-1">{row.label}</span>
      <div className="w-20 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${PROGRESS_COLOR[row.status]}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 w-12 text-right">
        {row.value}%
      </span>
      <span className="text-[12px] text-zinc-400 w-28 text-right">{row.expected}</span>
      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${MATH_BADGE[row.status]}`}>
        {row.status}
      </span>
    </div>
  );
}

function AlertIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0 mt-0.5">
      <circle cx="7.5" cy="7.5" r="6.5" stroke={color} strokeWidth="1" />
      <path d="M7.5 4.5v3.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7.5" cy="10.5" r="0.75" fill={color} />
    </svg>
  );
}

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0 mt-0.5">
      <path d="M7.5 2L13.5 12.5H1.5L7.5 2z" stroke={color} strokeWidth="1" strokeLinejoin="round" />
      <path d="M7.5 6v3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="7.5" cy="10.5" r="0.75" fill={color} />
    </svg>
  );
}