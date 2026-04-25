"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChartColumnBig,
  CircleUserRound,
  CreditCard,
  FolderGit2,
  FolderKanban,
  Settings,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  SquareKanban,
  Weight,
  ArrowRightLeft,
  BookOpen,

} from "lucide-react";

import { cn } from "@/lib/utils";
import Header from "@/components/common/header";

const primaryNav = [
  { href: "/dashboard", label: "Document Library", icon: CircleUserRound },
  { href: "/templates", label: "Word Templates", icon: LayoutDashboard },
  { href: "/convert", label: "Format Converter", icon: ChartColumnBig },
  { href: "/diff", label: "Syllabus Comparison", icon: FolderGit2 },
  { href: "/integrity-ai", label: "Integrity Review", icon: FolderKanban },
  { href: "/plan-tools", label: "Plan Alignment", icon: SquareKanban },
  { href: "/audit", label: "Quality audit", icon: ShieldCheck },
  { href: "/weights", label: "Grading weights", icon: Weight},
  { href: "/batch-replace", label: "Text replacements", icon: ArrowRightLeft },

];

const footerNav = [
  { href: "/templates", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname === "/dashboard" || pathname === "/";

  return (
    <div className="min-h-screen bg-zinc-950 px-3 py-3 text-zinc-100 md:px-4 md:py-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1500px] gap-3">
        <aside className="flex w-72 shrink-0 flex-col rounded-[28px] border border-zinc-800 bg-zinc-900/95 p-2">
          <div className="px-3 py-3">
            <Link href="/dashboard" className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-zinc-800/60">
              <div className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-900">
                <span className="text-xs font-bold">CS</span>
              </div>
              <span className="text-base font-semibold text-white">Nume</span>
            </Link>
          </div>

          <div className="mt-1 flex min-h-0 flex-1 flex-col gap-2 px-2">
            <nav className="flex flex-col gap-1">
              {primaryNav.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={`${href}-${label}`}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                      active ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5 text-white/60" aria-hidden />
                    <span className="text-white">{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex-1" />

            <div className="space-y-3 p-1">
              <nav className="space-y-1">
                {footerNav.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-white/70 hover:bg-zinc-800 hover:text-white">
                    <Icon className="h-[18px] w-[18px] text-white/60" aria-hidden />
                    <span className="text-white">{label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5 text-white">
            <p className="text-sm font-semibold leading-none">ioana</p>
            <p className="mt-1 text-xs text-zinc-400">ioana@email.com</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
              <Bell className="size-3.5" aria-hidden />
              Active workspace
            </div>
          </div>
        </aside>

        <div className="flex min-h-full flex-1 flex-col rounded-3xl border border-zinc-800 bg-zinc-900/95">
          {isDashboard ? (
            <div className="border-b border-zinc-800 px-5 py-5 md:px-8 md:py-6">
              <Header
                title="Dashboard"
                buttonText="Upload"
                buttonIcon={<Plus size={20} />}
                buttonOnClick={() => router.push("/upload")}
                summary={
                  <div className="text-muted-foreground flex gap-1 overflow-hidden text-base font-semibold text-ellipsis whitespace-nowrap">
                    Overview dashboard ready for{" "}
                    <span className="text-foreground flex items-center gap-1">
                      <CreditCard size={20} />
                      new modules
                    </span>
                  </div>
                }
              />
            </div>
          ) : null}
          <main className="flex-1 overflow-y-auto p-5 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
