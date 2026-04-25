import { putUpload } from "@/lib/idb";
import { sha256Hex } from "@/lib/sha256";

export async function saveUploadToLibrary(
  file: File,
  options?: { serverPath?: string; displayName?: string }
): Promise<string> {
  const hash = await sha256Hex(file);
  await putUpload({
    hash,
    displayName: options?.displayName ?? file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    savedAt: Date.now(),
    lastServerPath: options?.serverPath,
    blob: file,
  });
  return hash;
}
