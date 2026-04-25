"use client";

import { useEffect, useState } from "react";

export default function FileSettingsPage() {
  const [font, setFont] = useState("Georgia, serif");
  const [size, setSize] = useState("16px");
  const [lineHeight, setLineHeight] = useState("1.5");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("document.pdf");
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    console.log({ font, size, lineHeight, theme });
    setApplied(true);
    setTimeout(() => setApplied(false), 1800);
  };

  useEffect(() => {
    const stored = localStorage.getItem("uploadedFile");
    if (!stored) return;
    const parsed = JSON.parse(stored);
    setFileName(parsed.name);
    setFileData(parsed.data);
  }, []);

  const fontLabel = font.split(",")[0].replace(/'/g, "").trim();

  const canvasBg = theme === "dark" ? "#1a1a1a" : "white";
  const canvasBorder = theme === "dark" ? "#333" : "#e5e5e5";
  const canvasHeadingColor = theme === "dark" ? "#f0f0f0" : "#111";
  const canvasTextColor = theme === "dark" ? "#aaa" : "#555";

  return (
    <div className="flex min-h-screen">
     
      <aside className="w-[300px] shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-6 flex flex-col gap-6">
       
        <div>
          <h1 className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
            Document settings
          </h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Customize how your file is displayed
          </p>
        </div>

        <div>
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-3">
            Typography
          </p>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-zinc-500 dark:text-zinc-400">
                Font family
              </label>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 appearance-none outline-none hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer"
              >
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="Palatino, serif">Palatino</option>
                <option value="Verdana, sans-serif">Verdana</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-zinc-500 dark:text-zinc-400">
                Font size
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 appearance-none outline-none hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer"
              >
                <option value="12px">12px — small</option>
                <option value="14px">14px — compact</option>
                <option value="16px">16px — default</option>
                <option value="18px">18px — comfortable</option>
                <option value="20px">20px — large</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] text-zinc-500 dark:text-zinc-400">
                Line height
              </label>
              <select
                value={lineHeight}
                onChange={(e) => setLineHeight(e.target.value)}
                className="w-full px-3 py-1.5 text-[13px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 appearance-none outline-none hover:border-zinc-400 dark:hover:border-zinc-500 cursor-pointer"
              >
                <option value="1.2">1.2 — compact</option>
                <option value="1.5">1.5 — normal</option>
                <option value="1.8">1.8 — relaxed</option>
                <option value="2.0">2.0 — airy</option>
              </select>
            </div>
          </div>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        <div>
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-3">
            Appearance
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setTheme("light")}
              className={`py-2 text-[13px] rounded-lg border transition-colors cursor-pointer ${
                theme === "light"
                  ? "border-zinc-400 dark:border-zinc-500 text-zinc-900 dark:text-zinc-100 font-medium bg-white dark:bg-zinc-800"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 bg-transparent hover:border-zinc-300"
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`py-2 text-[13px] rounded-lg border transition-colors cursor-pointer ${
                theme === "dark"
                  ? "border-zinc-400 dark:border-zinc-500 text-zinc-900 dark:text-zinc-100 font-medium bg-white dark:bg-zinc-800"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 bg-transparent hover:border-zinc-300"
              }`}
            >
              Dark
            </button>
          </div>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        <div className="mt-auto">
          <button
            onClick={handleApply}
            className={`w-full py-2 text-[13px] font-medium rounded-lg transition-colors cursor-pointer ${
              applied
                ? "bg-emerald-600 text-white"
                : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300"
            }`}
          >
            {applied ? "Settings applied" : "Apply settings"}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 flex flex-col gap-4 bg-white dark:bg-zinc-950">
        
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest">
            Live preview
          </span>
          <span className="text-[12px] text-zinc-400">
            {fontLabel} · {size} · {lineHeight}
          </span>
        </div>

        {fileData ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900">
              <svg
                className="w-4 h-4 text-blue-500"
                viewBox="0 0 12 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 1h7l3 3v9H1V1z"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <path d="M8 1v3h3" stroke="currentColor" strokeWidth="1" />
              </svg>
              <span className="text-[13px] text-zinc-500">{fileName}</span>
            </div>
            {fileData.includes("application/pdf") ? (
              <iframe src={fileData} className="w-full h-[500px]" />
            ) : (
              <img src={fileData} className="max-w-full" alt={fileName} />
            )}
          </div>
        ) : (
          
          <div
            className="rounded-xl border overflow-hidden flex-1"
            style={{ borderColor: "#222", background: "#111" }}
          >
            <div
              className="px-4 py-2.5 border-b flex items-center gap-2"
              style={{
                borderColor: canvasBorder,
                background: theme === "dark" ? "#222" : "#fafafa",
              }}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 12 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 1h7l3 3v9H1V1z"
                  stroke={theme === "dark" ? "#555" : "#aaa"}
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 1v3h3"
                  stroke={theme === "dark" ? "#555" : "#aaa"}
                  strokeWidth="1"
                />
              </svg>
              <span
                className="text-[13px]"
                style={{ color: theme === "dark" ? "#666" : "#aaa" }}
              >
                {fileName}
              </span>
            </div>

            <div
              className="p-10"
              style={{
                fontFamily: font,
                fontSize: size,
                lineHeight,
              }}
            >
              <h2
                style={{
                  fontSize: "1.3em",
                  fontFamily: font,
                  color: canvasHeadingColor,
                  marginBottom: "0.5em",
                  fontWeight: 500,
                }}
              >
                Introduction
              </h2>
              <p style={{ color: canvasTextColor, marginBottom: "1em" }}>
                This is a preview of your document. The text below reflects
                your current typography and appearance settings in real time.
              </p>
              <p style={{ color: canvasTextColor, marginBottom: "1em" }}>
                Adjust the font family, size, and line height from the sidebar
                to see how your document will look before applying. Changes
                take effect instantly here.
              </p>
              <p style={{ color: canvasTextColor }}>
                Use the appearance toggle to switch between light and dark
                reading modes. Dark mode is easier on the eyes for extended
                reading sessions.
              </p>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Font", value: fontLabel },
            { label: "Size", value: size },
            { label: "Line height", value: lineHeight },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-zinc-50 dark:bg-zinc-900 rounded-lg px-4 py-3"
            >
              <p className="text-[12px] text-zinc-400 mb-1">{label}</p>
              <p className="text-[18px] font-medium text-zinc-900 dark:text-zinc-100">
                {value}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}