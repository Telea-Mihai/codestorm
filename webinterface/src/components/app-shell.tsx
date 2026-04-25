"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  GitCompare,
  Home,
  LayoutDashboard,
  Layers,
  LayoutTemplate,
  PencilLine,
  RefreshCw,
  Scale,
  SearchCheck,
  ShieldCheck,
  Upload,
  Wand2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const coreNav = [
  { href: "/dashboard", label: "Document library", icon: LayoutDashboard },
  { href: "/upload", label: "Quick upload", icon: Upload },
  { href: "/", label: "Home", icon: Home },
];

const toolsNav = [
  { href: "/templates", label: "Word templates", icon: LayoutTemplate },
  { href: "/convert", label: "Format converter", icon: RefreshCw },
  { href: "/diff", label: "Syllabus comparison", icon: GitCompare },
  { href: "/integrity-ai", label: "Integrity review", icon: ShieldCheck },
  { href: "/plan-tools", label: "Plan alignment", icon: Layers },
  { href: "/audit", label: "Quality audit", icon: SearchCheck },
  { href: "/weights", label: "Grading weights", icon: Scale },
  { href: "/batch-replace", label: "Text replacements", icon: Wand2 },
  { href: "/rewrite", label: "Writing assistant", icon: PencilLine },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950 px-3 py-3 text-zinc-100 md:px-4 md:py-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1500px] gap-3">
        <aside className="flex w-64 shrink-0 flex-col rounded-3xl border border-zinc-800 bg-zinc-900/95">
          <div className="px-5 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              CodeStorm
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-100">
              Teacher Workspace
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Organize course documents, review updates, and run teaching-focused checks from one place.
            </p>
          </div>
          <Separator className="bg-zinc-800" />

          <div className="p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Core flow
            </p>
            <nav className="flex flex-col gap-1">
              {coreNav.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-zinc-100 text-zinc-900"
                        : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1">{label}</span>
                    <ChevronRight
                      className={cn(
                        "size-3.5 opacity-0 transition-opacity group-hover:opacity-70",
                        active && "opacity-80"
                      )}
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          <Separator className="bg-zinc-800" />
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Tool pages
            </p>
            <nav className="flex flex-col gap-0.5">
              {toolsNav.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-zinc-100 text-zinc-900"
                        : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-3 pt-0">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2.5 text-xs text-zinc-400">
              Local library enabled: your saved files stay ready in this browser across tool pages.
            </div>
          </div>
        </aside>

        <div className="flex min-h-full flex-1 flex-col rounded-3xl border border-zinc-800 bg-zinc-900/95">
          <main className="flex-1 overflow-y-auto p-5 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
