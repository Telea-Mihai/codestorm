"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { ChevronLeft, Upload, X } from "lucide-react";

type UploadModalLayoutProps = {
  setModalOpen: (open: boolean) => void;
};

export default function UploadModal({
  setModalOpen,
}: UploadModalLayoutProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  
  const handleUpload = async () => {
  if (!file) return;

  setIsLoading(true);

  try {
    await new Promise((r) => setTimeout(r, 500));

    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result as string;

      localStorage.setItem(
        "uploadedFile",
        JSON.stringify({
          name: file.name,
          type: file.type,
          data: base64,
        })
      );

      console.log("File saved to localStorage");

      window.location.href = "/formatting";
    };

    reader.readAsDataURL(file);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setModalOpen(false)}
          className="text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-500"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-sm text-zinc-500 flex-1 pl-80">Upload a file</div>
        <button
          onClick={() => setModalOpen(false)}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-6 rounded-xl border border-dashed border-zinc-600 bg-zinc-800 p-6 flex flex-col items-center text-center">
            <Upload className="h-10 w-10 text-zinc-400 mb-3" />

            <h2 className="text-lg font-semibold text-zinc-100">
              Select file to upload
            </h2>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="
      mt-4
      file:mr-4 file:rounded-lg file:border-0
      file:bg-zinc-900 file:px-4 file:py-2
      file:text-sm file:text-zinc-200
      hover:file:bg-zinc-700
      text-sm text-zinc-400
    "
            />

            {file && (
              <div className="mt-3 text-sm text-zinc-400">
                Selected: <span className="text-zinc-200">{file.name}</span>
              </div>
            )}
          </div>

          <div className="col-span-6">
            <Button
              onClick={handleUpload}
              disabled={!file || isLoading}
              className="w-full mt-1 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600"
            >
              {isLoading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
