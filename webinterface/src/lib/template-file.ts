import type { TemplateRecord } from "@/lib/idb";

export function templateRecordToFile(record: TemplateRecord): File {
  const safe = record.name.replace(/[/\\?%*:|"<>]/g, "_").trim() || "template";
  return new File([record.blob], `${safe}.docx`, {
    type:
      record.blob.type ||
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    lastModified: record.savedAt,
  });
}
