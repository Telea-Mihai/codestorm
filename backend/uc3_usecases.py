import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from google import genai
from google.genai import types
from pydantic import BaseModel, Field


class UC3Error(Exception):
    """Raised when UC3 request input is invalid or cannot be processed."""


def _split_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def _extract_links(text: str) -> list[str]:
    return re.findall(r"https?://[^\s)\]>]+", text, flags=re.IGNORECASE)


def _is_likely_generic_heading(line: str) -> bool:
    if len(line) > 90:
        return False

    generic_tokens = {
        "introducere",
        "introduction",
        "curs",
        "course",
        "tema",
        "tematica",
        "generalitati",
        "overview",
        "chapter",
        "capitol",
    }

    lowered = line.lower()
    if any(token in lowered for token in generic_tokens):
        specific_tokens = {
            "algoritm",
            "program",
            "date",
            "systems",
            "model",
            "ai",
            "machine",
            "software",
            "network",
            "security",
            "database",
            "statistica",
            "matemat",
            "econom",
        }
        return not any(token in lowered for token in specific_tokens)

    return False


def run_content_auditor(text: str, now_year: int | None = None) -> dict[str, Any]:
    if not text or not text.strip():
        raise UC3Error("Document text is empty.")

    year_ref = now_year or datetime.now().year
    lines = _split_lines(text)

    generic_sections = []
    for index, line in enumerate(lines, start=1):
        if _is_likely_generic_heading(line):
            generic_sections.append(
                {
                    "line": index,
                    "text": line,
                    "reason": "Heading appears generic and may need discipline-specific detail.",
                }
            )

    bibliography_zone = [
        line for line in lines if re.search(r"bibliogr|references?|referinte", line, flags=re.IGNORECASE)
    ]
    year_matches = []
    for line in bibliography_zone:
        for raw_year in re.findall(r"\b(19\d{2}|20\d{2})\b", line):
            year_matches.append(int(raw_year))

    recent_threshold = year_ref - 5
    has_recent_source = any(year >= recent_threshold for year in year_matches)

    links = _extract_links(text)
    link_checks = []
    for link in links:
        parsed = urlparse(link)
        is_valid_shape = bool(parsed.scheme in {"http", "https"} and parsed.netloc)
        link_checks.append(
            {
                "url": link,
                "format_valid": is_valid_shape,
            }
        )

    suggestions = []
    if generic_sections:
        suggestions.append(
            "Replace generic headings with measurable, domain-specific outcomes (verbs + concrete topics)."
        )
    if bibliography_zone and not has_recent_source:
        suggestions.append(
            f"Add at least one bibliography source from {recent_threshold} or newer."
        )
    if any(not item["format_valid"] for item in link_checks):
        suggestions.append("Fix malformed external links in bibliography/resources.")

    return {
        "generic_sections": generic_sections,
        "bibliography": {
            "detected_entries": len(bibliography_zone),
            "years_found": sorted(set(year_matches)),
            "requires_recent_year": recent_threshold,
            "has_recent_source": has_recent_source,
        },
        "external_links": {
            "total": len(link_checks),
            "checks": link_checks,
        },
        "suggestions": suggestions,
    }


def _apply_replacements(text: str, replacements: list[dict[str, str]]) -> tuple[str, list[dict[str, Any]]]:
    updated = text
    changes = []
    for item in replacements:
        find = (item.get("find") or "").strip()
        replace = item.get("replace", "")
        if not find:
            continue

        count = updated.count(find)
        if count > 0:
            updated = updated.replace(find, replace)
            changes.append(
                {
                    "find": find,
                    "replace": replace,
                    "occurrences": count,
                }
            )

    return updated, changes


def run_smart_updater(
    documents: list[dict[str, str]],
    replacements: list[dict[str, str]],
    apply_changes: bool,
    output_dir: str,
) -> dict[str, Any]:
    if not documents:
        raise UC3Error("At least one document is required.")

    if not replacements:
        raise UC3Error("At least one replacement rule is required.")

    review = []
    generated_files = []
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    apply_dir = os.path.join(output_dir, f"smart_updates_{timestamp}")
    if apply_changes:
        os.makedirs(apply_dir, exist_ok=True)

    for doc in documents:
        name = doc.get("name") or "document"
        content = doc.get("content") or ""
        updated, changes = _apply_replacements(content, replacements)

        review.append(
            {
                "document": name,
                "changed": bool(changes),
                "applied_rules": changes,
                "preview": {
                    "before_chars": len(content),
                    "after_chars": len(updated),
                },
            }
        )

        if apply_changes:
            safe_name = re.sub(r"[^A-Za-z0-9_.-]", "_", Path(name).stem)
            target = os.path.join(apply_dir, f"{safe_name}_updated.txt")
            with open(target, "w", encoding="utf-8") as handle:
                handle.write(updated)
            generated_files.append(target)

    return {
        "mode": "apply" if apply_changes else "review",
        "documents": review,
        "generated_files": generated_files,
        "notes": [
            "For binary formats (.pdf/.docx), updated review artifacts are exported as .txt snapshots.",
        ],
    }


def run_academic_copilot(current_text: str, instruction: str) -> dict[str, Any]:
    if not current_text.strip():
        raise UC3Error("current_text must not be empty.")

    if not instruction.strip():
        raise UC3Error("instruction must not be empty.")

    cleaned = "\n".join(line.strip() for line in current_text.splitlines() if line.strip())
    rewritten = cleaned
    applied_rules = []

    if re.search(r"ai|artificial|inteligenta", instruction, flags=re.IGNORECASE):
        ai_block = (
            "\n\nApplied AI integration: This chapter now includes practical AI-enabled workflows, "
            "model-assisted decision points, and an ethics note on responsible deployment in academic contexts."
        )
        rewritten += ai_block
        applied_rules.append("ai-context-extension")

    if re.search(r"reform|clar|rescri|improve|refine", instruction, flags=re.IGNORECASE):
        rewritten = re.sub(r"\s+", " ", rewritten).strip()
        rewritten = rewritten.replace(". ", ".\n")
        applied_rules.append("clarity-reflow")

    if not applied_rules:
        rewritten += (
            "\n\nEditor note: Instruction acknowledged. Please provide explicit style or topic constraints "
            "for a deeper rewrite."
        )
        applied_rules.append("fallback-note")

    return {
        "instruction": instruction,
        "applied_rules": applied_rules,
        "draft": rewritten,
    }


def _parse_evaluation_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    parsed = []
    for item in items:
        label = str(item.get("label", "")).strip()
        raw_weight = item.get("weight")

        if raw_weight is None:
            text = str(item.get("text", ""))
            match = re.search(r"(-?\d+(?:\.\d+)?)\s*%", text)
            weight = float(match.group(1)) if match else 0.0
        else:
            weight = float(raw_weight)

        parsed.append({"label": label or "Unnamed", "weight": weight})

    return parsed


class ReguliNotare(BaseModel):
    procent_maxim_examen: float = Field(description="Procentul maxim permis pentru examenul final, ca numar zecimal (ex: 60 pentru 60%).")

def extract_grading_rules(plan_path: str) -> float:
    try:
        client = genai.Client(
            api_key=os.environ.get("GEMINI_API_KEY", "AIzaSyAxAAhnnaNl0WAz1wORFvCD-YSvH0lYeGU")
        )
        plan_doc = client.files.upload(file=plan_path)
        prompt = """
        Citește acest Plan de Învățământ și caută regulile de notare/evaluare.
        Extrage procentul maxim admis pentru 'Examen final' sau evaluarea principală (ex: ponderea maximă pentru examenul final).
        Dacă nu găsești nicio valoare specificată în mod explicit în tot documentul, returnează valoarea implicită: 60.
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[plan_doc, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ReguliNotare,
                temperature=0.0
            ),
        )
        DateExtrase = ReguliNotare.model_validate_json(response.text)
        return float(DateExtrase.procent_maxim_examen)
    except Exception as e:
        print(f"Failed to extract rules from plan: {e}")
        return 60.0


def run_auto_correct_validator(items: list[dict[str, Any]], plan_path: str = None) -> dict[str, Any]:
    if not items:
        raise UC3Error("At least one evaluation item is required.")

    parsed = _parse_evaluation_items(items)
    total = round(sum(row["weight"] for row in parsed), 2)
    violations = []

    max_exam_weight = 60.0
    if plan_path and os.path.exists(plan_path):
        max_exam_weight = extract_grading_rules(plan_path)

    final_exam_indices = [
        index
        for index, row in enumerate(parsed)
        if re.search(r"examen|final", row["label"], flags=re.IGNORECASE)
    ]

    for idx in final_exam_indices:
        if parsed[idx]["weight"] > max_exam_weight:
            violations.append(
                {
                    "rule": "final_exam_max_weight",
                    "message": f"Final exam weight is {parsed[idx]['weight']}%, above allowed limit of {max_exam_weight}%.",
                }
            )

    if total != 100:
        violations.append(
            {
                "rule": "sum_equals_100",
                "message": f"Total weight is {total}%, must be exactly 100%.",
            }
        )

    corrected = [dict(row) for row in parsed]

    for idx in final_exam_indices:
        if corrected[idx]["weight"] > max_exam_weight:
            excess = corrected[idx]["weight"] - max_exam_weight
            corrected[idx]["weight"] = float(max_exam_weight)

            receiver_indices = [
                i
                for i, row in enumerate(corrected)
                if i != idx and re.search(r"laborator|lab|seminar|proiect|project|activitate", row["label"], re.IGNORECASE)
            ]
            if not receiver_indices:
                receiver_indices = [i for i in range(len(corrected)) if i != idx]

            if receiver_indices:
                increment = excess / len(receiver_indices)
                for ridx in receiver_indices:
                    corrected[ridx]["weight"] = round(corrected[ridx]["weight"] + increment, 2)

    corrected_total = round(sum(row["weight"] for row in corrected), 2)
    drift = round(100 - corrected_total, 2)
    if corrected and abs(drift) > 0:
        corrected[0]["weight"] = round(corrected[0]["weight"] + drift, 2)

    return {
        "input_items": parsed,
        "total": total,
        "is_valid": not violations,
        "violations": violations,
        "suggested_distribution": corrected,
        "suggested_total": round(sum(row["weight"] for row in corrected), 2),
    }


def parse_replacements_payload(raw: str) -> list[dict[str, str]]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise UC3Error("Invalid JSON for replacements payload.") from exc

    if not isinstance(data, list):
        raise UC3Error("replacements must be a JSON array.")

    normalized = []
    for row in data:
        if not isinstance(row, dict):
            continue
        normalized.append(
            {
                "find": str(row.get("find", "")),
                "replace": str(row.get("replace", "")),
            }
        )

    return normalized