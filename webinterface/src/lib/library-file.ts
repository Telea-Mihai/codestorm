import type { UploadRecord } from "@/lib/idb";

export function uploadRecordToFile(record: UploadRecord): File {
  return new File([record.blob], record.displayName, {
    type: record.mimeType || "application/octet-stream",
    lastModified: record.savedAt,
  });
}
