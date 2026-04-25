"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { getUpload } from "@/lib/idb";
import { uploadRecordToFile } from "@/lib/library-file";

/**
 * When the URL contains `?lib=<indexeddb hash>`, load that saved upload into file state.
 */
export function useLibraryFileFromUrl(
  setFile: (file: File | null) => void,
  paramName = "lib"
): void {
  const searchParams = useSearchParams();

  useEffect(() => {
    const hash = searchParams.get(paramName);
    if (!hash) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const rec = await getUpload(hash);
      if (cancelled || !rec) {
        return;
      }
      setFile(uploadRecordToFile(rec));
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, paramName, setFile]);
}

export function useTwoLibraryFilesFromUrl(
  setFirst: (file: File | null) => void,
  setSecond: (file: File | null) => void,
  firstParam = "old",
  secondParam = "new"
): void {
  const searchParams = useSearchParams();

  useEffect(() => {
    const h1 = searchParams.get(firstParam);
    const h2 = searchParams.get(secondParam);
    if (!h1 && !h2) {
      return;
    }
    let cancelled = false;
    void (async () => {
      if (h1) {
        const rec = await getUpload(h1);
        if (!cancelled && rec) {
          setFirst(uploadRecordToFile(rec));
        }
      }
      if (h2) {
        const rec2 = await getUpload(h2);
        if (!cancelled && rec2) {
          setSecond(uploadRecordToFile(rec2));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, firstParam, secondParam, setFirst, setSecond]);
}

/**
 * `?lib=` loads a saved upload into the PDF or Word slot based on file extension.
 */
export function useLibraryFileForConvert(
  setPdfFile: (file: File | null) => void,
  setDocxFile: (file: File | null) => void,
  paramName = "lib"
): void {
  const searchParams = useSearchParams();

  useEffect(() => {
    const hash = searchParams.get(paramName);
    if (!hash) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const rec = await getUpload(hash);
      if (cancelled || !rec) {
        return;
      }
      const file = uploadRecordToFile(rec);
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".pdf")) {
        setPdfFile(file);
      } else if (lower.endsWith(".docx")) {
        setDocxFile(file);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, paramName, setPdfFile, setDocxFile]);
}
